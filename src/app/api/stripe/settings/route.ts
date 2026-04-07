import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// Stripe設定の取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data: settings } = await (admin
      .from("stripe_settings" as never)
      .select("*")
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

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
    const { secretKey, publishableKey, webhookSecret, paymentAutoEnabled, paymentAutoMessage, paymentAutoUrl, paymentAutoButtonText, paymentAutoTitle } = body

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: "シークレットキーと公開キーは必須です" }, { status: 400 })
    }

    const admin = createAdminClient()

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
      settingsData.payment_auto_button_text = paymentAutoButtonText || null
      settingsData.payment_auto_title = paymentAutoTitle || null
    }

    if (existing) {
      const { error } = await (admin
        .from("stripe_settings" as never)
        .update(settingsData as never)
        .eq("id" as never, existing.id) as unknown as Promise<{ error: unknown }>)
      if (error) throw error
    } else {
      const { error } = await (admin
        .from("stripe_settings" as never)
        .insert({
          organization_id: orgId,
          ...settingsData,
        } as never) as unknown as Promise<{ error: unknown }>)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stripe settings POST error:", error)
    return NextResponse.json({ error: "Stripe設定の保存に失敗しました" }, { status: 500 })
  }
}
