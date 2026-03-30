import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { createStripeClient } from "@/lib/stripe/client"
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
