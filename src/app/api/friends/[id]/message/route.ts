import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { pushMessage } from "@/lib/line/client"
import { createAdminClient } from "@/lib/supabase/server"

// 個別メッセージ送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: friendId } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { message } = await request.json()
    if (!message) return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 })

    // 友だち情報を取得
    const { data: friend } = await supabase
      .from("friends")
      .select("line_user_id, line_account_id")
      .eq("id", friendId)
      .single()

    if (!friend || !friend.line_account_id) return NextResponse.json({ error: "友だちが見つかりません" }, { status: 404 })

    // LINE アカウント情報を取得
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("channel_access_token")
      .eq("id", friend.line_account_id as string)
      .single()

    if (!lineAccount) return NextResponse.json({ error: "LINE設定が見つかりません" }, { status: 404 })

    // メッセージ送信
    await pushMessage(
      friend.line_user_id,
      [{ type: "text", text: message }],
      { accessToken: lineAccount.channel_access_token }
    )

    // 送信履歴を message_logs に記録（管理画面の友だち詳細で参照される）
    // admin clientを使用してRLSに関わらず確実にinsert
    try {
      const admin = createAdminClient()
      await admin.from("message_logs").insert({
        organization_id: orgId,
        friend_id: friendId,
        line_user_id: friend.line_user_id,
        event_type: "message_send",
        message_type: "text",
        content: message,
      })
    } catch (logError) {
      // ログ記録の失敗は送信成功に影響させない
      console.error("Message log insert error:", logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 })
  }
}
