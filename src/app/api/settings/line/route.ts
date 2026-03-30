import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// LINE連携設定の取得
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

    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .single()

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/line`

    return NextResponse.json({
      lineAccount: lineAccount || null,
      webhookUrl,
    })
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
  }
}

// LINE連携設定の保存
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
    const { channelName, channelId, channelSecret, channelAccessToken } = body

    if (!channelName || !channelId || !channelSecret || !channelAccessToken) {
      return NextResponse.json({ error: "全ての項目を入力してください" }, { status: 400 })
    }

    // 既存のline_accountがあればUPDATE、なければINSERT
    const { data: existing } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("organization_id", orgId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from("line_accounts")
        .update({
          channel_name: channelName,
          channel_id: channelId,
          channel_secret: channelSecret,
          channel_access_token: channelAccessToken,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("line_accounts")
        .insert({
          organization_id: orgId,
          channel_name: channelName,
          channel_id: channelId,
          channel_secret: channelSecret,
          channel_access_token: channelAccessToken,
        })
      if (error) throw error
    }

    // 「新規」タグがなければ自動作成
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", "新規")
      .single()

    if (!existingTag) {
      await supabase.from("tags").insert({
        organization_id: orgId,
        name: "新規",
        color: "#06C755",
        description: "友だち追加時に自動付与されるタグ",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings POST error:", error)
    return NextResponse.json({ error: "設定の保存に失敗しました" }, { status: 500 })
  }
}
