import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// Stripe設定の取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: settings } = await supabase
      .from("stripe_settings")
      .select("*")
      .eq("organization_id", orgId)
      .single()

    return NextResponse.json({
      settings: settings || null,
    })
  } catch (error) {
    console.error("Stripe settings GET error:", error)
    return NextResponse.json({ error: "Stripe設定の取得に失敗しました" }, { status: 500 })
  }
}

// Stripe設定の保存
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { secretKey, publishableKey, webhookSecret, paymentAutoEnabled, paymentAutoMessage, paymentAutoUrl } = body

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: "シークレットキーと公開キーは必須です" }, { status: 400 })
    }

    // 既存の設定があればUPDATE、なければINSERT
    const { data: existing } = await supabase
      .from("stripe_settings")
      .select("id")
      .eq("organization_id", orgId)
      .single()

    const settingsData: Record<string, unknown> = {
      stripe_secret_key: secretKey,
      stripe_publishable_key: publishableKey,
      stripe_webhook_secret: webhookSecret || null,
      updated_at: new Date().toISOString(),
    }

    // 入金後自動メッセージ設定（送信された場合のみ更新）
    if (paymentAutoEnabled !== undefined) {
      settingsData.payment_auto_enabled = paymentAutoEnabled
      settingsData.payment_auto_message = paymentAutoMessage || null
      settingsData.payment_auto_url = paymentAutoUrl || null
    }

    if (existing) {
      const { error } = await supabase
        .from("stripe_settings")
        .update(settingsData)
        .eq("id", existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("stripe_settings")
        .insert({
          organization_id: orgId,
          ...settingsData,
        })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stripe settings POST error:", error)
    return NextResponse.json({ error: "Stripe設定の保存に失敗しました" }, { status: 500 })
  }
}
