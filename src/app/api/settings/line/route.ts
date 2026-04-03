import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// LINE連携設定の取得（複数アカウント対応）
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: lineAccounts } = await supabase
      .from("line_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/line`

    return NextResponse.json({
      lineAccounts: lineAccounts || [],
      webhookUrl,
    })
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
  }
}

// LINE連携設定の保存（新規作成・更新対応）
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { id, channelName, channelId, channelSecret, channelAccessToken, webhookActive } = body

    if (!channelName || !channelId || !channelSecret || !channelAccessToken) {
      return NextResponse.json({ error: "全ての項目を入力してください" }, { status: 400 })
    }

    if (id) {
      // 更新: 指定IDのアカウントが同じ組織に属しているか確認
      const { data: existing } = await supabase
        .from("line_accounts")
        .select("id")
        .eq("id", id)
        .eq("organization_id", orgId)
        .single()

      if (!existing) {
        return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 })
      }

      const { error: updateError } = await supabase
        .from("line_accounts")
        .update({
          channel_name: channelName,
          channel_id: channelId,
          channel_secret: channelSecret,
          channel_access_token: channelAccessToken,
          webhook_active: webhookActive ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
      if (updateError) throw updateError
    } else {
      // 新規作成
      const { error: insertError } = await supabase
        .from("line_accounts")
        .insert({
          organization_id: orgId,
          channel_name: channelName,
          channel_id: channelId,
          channel_secret: channelSecret,
          channel_access_token: channelAccessToken,
          webhook_active: webhookActive ?? true,
        })
      if (insertError) throw insertError
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

// LINE連携設定の削除
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "アカウントIDが必要です" }, { status: 400 })
    }

    // 同じ組織に属しているか確認
    const { data: existing } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("line_accounts")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings DELETE error:", error)
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 })
  }
}
