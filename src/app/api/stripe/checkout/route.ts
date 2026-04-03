import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createStripeClient } from "@/lib/stripe/client"

// Stripeチェックアウトセッション作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { amount, description, friendId, seminarId, successUrl, cancelUrl } = body

    if (!amount || !description || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 })
    }

    // Stripe設定を取得
    const { data: settings } = await supabase
      .from("stripe_settings")
      .select("*")
      .eq("organization_id", orgId)
      .single()

    if (!settings || !settings.stripe_secret_key) {
      return NextResponse.json({ error: "Stripe設定が見つかりません。先にStripe連携設定を行ってください。" }, { status: 400 })
    }

    const stripe = createStripeClient(settings.stripe_secret_key)
    const currency = "jpy"

    // Stripeチェックアウトセッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: currency === "jpy" ? amount : Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organization_id: orgId,
        friend_id: friendId || "",
        seminar_id: seminarId || "",
      },
    })

    // 支払いレコードを保存
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        organization_id: orgId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        friend_id: friendId || null,
        seminar_id: seminarId || null,
        amount,
        currency,
        status: "pending",
        payment_type: "checkout",
        item_name: description,
        metadata: {
          seminar_id: seminarId || null,
        },
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      payment,
    })
  } catch (error) {
    console.error("Stripe checkout POST error:", error)
    return NextResponse.json({ error: "チェックアウトセッションの作成に失敗しました" }, { status: 500 })
  }
}
