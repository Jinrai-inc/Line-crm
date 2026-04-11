import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { createStripeClient } from "@/lib/stripe/client"
import { pushMessage } from "@/lib/line/client"
import { createZoomLinkMessage } from "@/lib/line/flex-templates"
import type Stripe from "stripe"

// Stripe Webhookハンドラ
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      return NextResponse.json({ error: "署名がありません" }, { status: 400 })
    }

    // Admin clientを使用（Webhookはユーザー認証なし）
    const supabase = createAdminClient()

    // イベントからorganization_idを特定するため、まずシグネチャ検証前にメタデータを確認
    // すべてのStripe設定を取得してwebhook_secretで検証を試みる
    const { data: allSettings } = await supabase
      .from("stripe_settings")
      .select("*")

    if (!allSettings || allSettings.length === 0) {
      return NextResponse.json({ error: "Stripe設定が見つかりません" }, { status: 400 })
    }

    let event: Stripe.Event | null = null
    let matchedSettings = null

    for (const settings of allSettings) {
      if (!settings.stripe_webhook_secret || !settings.stripe_secret_key) continue
      try {
        const stripe = createStripeClient(settings.stripe_secret_key)
        event = stripe.webhooks.constructEvent(body, sig, settings.stripe_webhook_secret)
        matchedSettings = settings
        break
      } catch {
        // この設定のwebhook_secretでは検証できなかった、次を試す
        continue
      }
    }

    if (!event || !matchedSettings) {
      return NextResponse.json({ error: "Webhook署名の検証に失敗しました" }, { status: 400 })
    }

    // イベント処理
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const { error } = await supabase
          .from("payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: (session.payment_intent as string) || null,
            payment_method: session.payment_method_types?.[0] || "card",
            paid_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id)
        if (error) {
          console.error("Payment update error (checkout.session.completed):", error)
        }

        // 決済完了後のLINE通知処理
        try {
          // friend_idを取得（メタデータまたはpaymentsテーブルから）
          const friendId = session.metadata?.friend_id
          let lineUserId: string | null = null

          if (friendId) {
            const { data: friend } = await supabase
              .from("friends")
              .select("line_user_id")
              .eq("id", friendId)
              .single()
            lineUserId = friend?.line_user_id || null
          }

          if (!lineUserId) {
            // paymentsテーブルからfriend_idを取得
            const { data: payment } = await supabase
              .from("payments")
              .select("friend_id")
              .eq("stripe_checkout_session_id", session.id)
              .single()
            if (payment?.friend_id) {
              const { data: friend } = await supabase
                .from("friends")
                .select("line_user_id")
                .eq("id", payment.friend_id)
                .single()
              lineUserId = friend?.line_user_id || null
            }
          }

          if (lineUserId) {
            // LINE設定を取得
            const { data: lineAccount } = await supabase
              .from("line_accounts")
              .select("channel_access_token")
              .eq("organization_id", matchedSettings.organization_id!)
              .single()

            if (lineAccount?.channel_access_token) {
              const accessToken = lineAccount.channel_access_token

              // 1. 必ず決済完了の確認メッセージを送信
              await pushMessage(
                lineUserId,
                [{ type: "text", text: "お支払いが確認されました。ありがとうございます！" }],
                { accessToken }
              )

              // 2. セミナー固有のリンク送信（post_payment_url / zoom_url）
              const seminarId = session.metadata?.seminar_id
              let seminarHandled = false
              if (seminarId) {
                const { data: seminarRaw } = await supabase
                  .from("seminars")
                  .select("title, zoom_url, post_payment_url, zoom_note")
                  .eq("id", seminarId)
                  .single()

                const seminar = seminarRaw as { title: string; zoom_url?: string | null; post_payment_url?: string | null; zoom_note?: string | null } | null

                // セミナー固有の決済後URL（TimeRex等）
                if (seminar?.post_payment_url) {
                  seminarHandled = true
                  await pushMessage(
                    lineUserId,
                    [{
                      type: "flex",
                      altText: "ご案内",
                      contents: {
                        type: "bubble",
                        body: {
                          type: "box",
                          layout: "vertical",
                          contents: [
                            {
                              type: "text",
                              text: seminar.title,
                              weight: "bold",
                              size: "md",
                              wrap: true,
                            },
                            {
                              type: "text",
                              text: "以下のURLからご予約・詳細をご確認ください。",
                              wrap: true,
                              margin: "md",
                              size: "sm",
                              color: "#333333",
                            },
                          ],
                        },
                        footer: {
                          type: "box",
                          layout: "vertical",
                          spacing: "sm",
                          contents: [
                            {
                              type: "button",
                              style: "primary",
                              color: "#06C755",
                              action: {
                                type: "uri",
                                label: "予約ページを開く",
                                uri: seminar.post_payment_url,
                              },
                            },
                          ],
                        },
                      },
                    }],
                    { accessToken }
                  )
                }

                // Zoomリンク
                if (seminar?.zoom_url) {
                  seminarHandled = true
                  await pushMessage(
                    lineUserId,
                    [createZoomLinkMessage(seminar.title, seminar.zoom_url, seminar.zoom_note)],
                    { accessToken }
                  )
                }

                // 出席ステータスを「確認済み」に更新
                if (friendId) {
                  await supabase
                    .from("attendances")
                    .update({ status: "confirmed" })
                    .eq("friend_id", friendId)
                    .eq("seminar_id", seminarId)
                    .eq("status", "applied")
                }
              }

              // 3. セミナー固有URLがない場合のみ、グローバル自動メッセージを送信
              if (!seminarHandled) {
                const settings = matchedSettings as Record<string, unknown>
                if (settings.payment_auto_enabled && settings.payment_auto_url) {
                  const autoMessage = (settings.payment_auto_message as string) || "以下のURLからご予約・ご参加ください。"
                  const autoUrl = settings.payment_auto_url as string
                  const autoButtonText = (settings.payment_auto_button_text as string) || "URLを開く"
                  const autoTitle = (settings.payment_auto_title as string) || "ご案内"

                  await pushMessage(
                    lineUserId,
                    [{
                      type: "flex",
                      altText: autoTitle,
                      contents: {
                        type: "bubble",
                        body: {
                          type: "box",
                          layout: "vertical",
                          contents: [
                            {
                              type: "text",
                              text: autoTitle,
                              weight: "bold",
                              size: "lg",
                              color: "#06C755",
                            },
                            {
                              type: "text",
                              text: autoMessage,
                              wrap: true,
                              margin: "md",
                              size: "sm",
                              color: "#333333",
                            },
                          ],
                        },
                        footer: {
                          type: "box",
                          layout: "vertical",
                          spacing: "sm",
                          contents: [
                            {
                              type: "button",
                              style: "primary",
                              color: "#06C755",
                              action: {
                                type: "uri",
                                label: autoButtonText,
                                uri: autoUrl,
                              },
                            },
                          ],
                        },
                      },
                    }],
                    { accessToken }
                  )
                }
              }
            }
          }
        } catch (notifyError) {
          console.error("Payment notification error:", notifyError)
          // 通知失敗は決済処理に影響させない
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string
        if (paymentIntentId) {
          const { error } = await supabase
            .from("payments")
            .update({
              status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent_id", paymentIntentId)
          if (error) {
            console.error("Payment update error (charge.refunded):", error)
          }
        }
        break
      }

      default:
        // 未対応のイベントはスキップ
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Webhookの処理に失敗しました" }, { status: 500 })
  }
}
