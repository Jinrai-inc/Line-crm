import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { createStripeClient } from "@/lib/stripe/client"

export const maxDuration = 300

// pending 状態の支払いを Stripe に問い合わせて最新ステータスに同期する。
// Stripe Webhook が届いていない / 処理に失敗した等で DB が pending のまま
// 取り残された支払いを救済するためのエンドポイント。
export async function POST() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    // Stripe シークレットキーを取得
    const { data: stripeSettings } = await admin
      .from("stripe_settings")
      .select("stripe_secret_key")
      .eq("organization_id", orgId)
      .single()

    if (!stripeSettings?.stripe_secret_key) {
      return NextResponse.json(
        {
          error:
            "Stripe連携設定が見つかりません。設定 → Stripe連携 から連携してください。",
        },
        { status: 400 }
      )
    }

    const stripe = createStripeClient(stripeSettings.stripe_secret_key)

    // pending 状態の支払いを全て取得
    const { data: pendingPayments } = await admin
      .from("payments")
      .select(
        "id, stripe_checkout_session_id, stripe_payment_intent_id, status"
      )
      .eq("organization_id", orgId)
      .eq("status", "pending")

    if (!pendingPayments || pendingPayments.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        updated: 0,
        message: "未払いの決済はありません",
      })
    }

    let updatedCount = 0
    let failedCount = 0
    const errors: string[] = []
    // 個別の診断情報（UIでトラブルシュートに使う）
    const diagnostics: Array<{
      payment_id: string
      session_id: string | null
      intent_id: string | null
      stripe_payment_status: string | null
      stripe_intent_status: string | null
      action: "updated" | "no_change" | "no_stripe_info" | "error"
      error?: string
    }> = []

    for (const payment of pendingPayments) {
      const diag: {
        payment_id: string
        session_id: string | null
        intent_id: string | null
        stripe_payment_status: string | null
        stripe_intent_status: string | null
        action: "updated" | "no_change" | "no_stripe_info" | "error"
        error?: string
      } = {
        payment_id: payment.id as string,
        session_id: (payment.stripe_checkout_session_id as string | null) || null,
        intent_id: (payment.stripe_payment_intent_id as string | null) || null,
        stripe_payment_status: null,
        stripe_intent_status: null,
        action: "no_change",
      }

      try {
        let stripeStatus: "paid" | "pending" | "failed" | "refunded" | null =
          null
        let paymentIntentId: string | null =
          (payment.stripe_payment_intent_id as string | null) || null
        let paymentMethod: string | null = null

        // まず Checkout Session を参照（一番情報が揃っている）
        const sessionId = payment.stripe_checkout_session_id as string | null
        if (sessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            diag.stripe_payment_status = session.payment_status || null
            // session.payment_status: "paid" | "unpaid" | "no_payment_required"
            if (
              session.payment_status === "paid" ||
              session.payment_status === "no_payment_required"
            ) {
              stripeStatus = "paid"
            } else {
              stripeStatus = "pending"
            }
            paymentIntentId =
              (session.payment_intent as string) || paymentIntentId
            paymentMethod = session.payment_method_types?.[0] || null
            diag.intent_id = paymentIntentId
          } catch (sessionError) {
            console.warn(
              "Stripe session retrieve failed:",
              sessionId,
              sessionError
            )
          }
        }

        // Session から取れなかった場合、PaymentIntent で代替
        if (!stripeStatus && paymentIntentId) {
          try {
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
            diag.stripe_intent_status = intent.status || null
            if (intent.status === "succeeded") {
              stripeStatus = "paid"
            } else if (intent.status === "canceled") {
              stripeStatus = "failed"
            } else {
              stripeStatus = "pending"
            }
          } catch (intentError) {
            console.warn(
              "Stripe paymentIntent retrieve failed:",
              paymentIntentId,
              intentError
            )
          }
        }

        if (!stripeStatus) {
          failedCount++
          diag.action = "no_stripe_info"
          diag.error = "Stripe側の情報を取得できませんでした"
          errors.push(
            `[payment ${payment.id}] Stripe側の情報を取得できませんでした`
          )
          diagnostics.push(diag)
          continue
        }

        // pending → paid 等の変化があった場合のみ更新
        if (stripeStatus !== "pending" && stripeStatus !== payment.status) {
          const updatePatch: Record<string, unknown> = {
            status: stripeStatus,
          }
          if (stripeStatus === "paid") {
            updatePatch.paid_at = new Date().toISOString()
            if (paymentIntentId) {
              updatePatch.stripe_payment_intent_id = paymentIntentId
            }
            if (paymentMethod) {
              updatePatch.payment_method = paymentMethod
            }
          }
          const { error: updateError } = await admin
            .from("payments")
            .update(updatePatch)
            .eq("id", payment.id)
          if (updateError) {
            failedCount++
            diag.action = "error"
            diag.error = updateError.message
            errors.push(`[payment ${payment.id}] ${updateError.message}`)
          } else {
            updatedCount++
            diag.action = "updated"
          }
        } else {
          diag.action = "no_change"
        }
      } catch (err) {
        failedCount++
        const msg = err instanceof Error ? err.message : "不明なエラー"
        diag.action = "error"
        diag.error = msg
        errors.push(`[payment ${payment.id}] ${msg}`)
      }
      diagnostics.push(diag)
    }

    return NextResponse.json({
      success: true,
      checked: pendingPayments.length,
      updated: updatedCount,
      failed: failedCount,
      errors: errors.slice(0, 20),
      diagnostics,
      message:
        updatedCount > 0
          ? `${updatedCount}件の決済を最新状態に更新しました`
          : "更新対象の決済はありませんでした",
    })
  } catch (error) {
    console.error("Payments sync error:", error)
    return NextResponse.json(
      { error: "支払いの同期に失敗しました" },
      { status: 500 }
    )
  }
}
