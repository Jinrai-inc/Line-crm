import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Stripe設定の取得
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

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
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

    const body = await request.json()
    const { secretKey, publishableKey, webhookSecret } = body

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: "シークレットキーと公開キーは必須です" }, { status: 400 })
    }

    // 既存の設定があればUPDATE、なければINSERT
    const { data: existing } = await supabase
      .from("stripe_settings")
      .select("id")
      .eq("organization_id", orgId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from("stripe_settings")
        .update({
          stripe_secret_key: secretKey,
          stripe_publishable_key: publishableKey,
          stripe_webhook_secret: webhookSecret || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("stripe_settings")
        .insert({
          organization_id: orgId,
          stripe_secret_key: secretKey,
          stripe_publishable_key: publishableKey,
          stripe_webhook_secret: webhookSecret || null,
        })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Stripe settings POST error:", error)
    return NextResponse.json({ error: "Stripe設定の保存に失敗しました" }, { status: 500 })
  }
}
