import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { pushMessage } from "@/lib/line/client"

// 個別メッセージ送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: friendId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 })
  }
}
