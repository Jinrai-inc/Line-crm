import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessage } from "@/lib/line/client"

// 個別メッセージ送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: friendId } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // サーバー側の DB 書き込みは admin クライアントで行う（RLS バイパス）。
    // 組織境界は .eq("organization_id", orgId) で明示的に担保する。
    const supabase = createAdminClient()

    const { message } = await request.json()
    if (!message) return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 })

    // 友だち情報を取得（admin クライアント使用のため、organization_id を明示的に絞る）
    const { data: friend } = await supabase
      .from("friends")
      .select("line_user_id, line_account_id")
      .eq("id", friendId)
      .eq("organization_id", orgId)
      .single()

    if (!friend || !friend.line_account_id) return NextResponse.json({ error: "友だちが見つかりません" }, { status: 404 })

    // LINE アカウント情報を取得（同じく organization_id で絞る）
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("channel_access_token")
      .eq("id", friend.line_account_id as string)
      .eq("organization_id", orgId)
      .single()

    if (!lineAccount) return NextResponse.json({ error: "LINE設定が見つかりません" }, { status: 404 })

    // メッセージ送信
    await pushMessage(
      friend.line_user_id,
      [{ type: "text", text: message }],
      { accessToken: lineAccount.channel_access_token }
    )

    // 個別メッセージ履歴に「送信済み」として記録
    // event_type="message_send" は友だち詳細画面で outgoing 扱いされる。
    // 送信は既に成功しているので、ログ挿入が失敗してもユーザー応答には影響させない。
    try {
      const { error: logErr } = await supabase.from("message_logs").insert({
        organization_id: orgId,
        friend_id: friendId,
        line_user_id: friend.line_user_id,
        event_type: "message_send",
        message_type: "text",
        content: message,
      })
      if (logErr) {
        console.error("Individual message log insert error:", logErr)
      }
    } catch (err) {
      console.error("Individual message log insert threw:", err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 })
  }
}
