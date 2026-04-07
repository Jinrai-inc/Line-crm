import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// 未読の友だち数を取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    // last_message_at > read_at (or read_at is null) の友だちをカウント
    // message_logsの受信メッセージ(event_type='message')があり、read_atがnullまたはそれ以前のもの
    const { data, error } = await (admin
      .from("friends")
      .select("id, last_message_at, read_at", { count: "exact", head: false })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .not("last_message_at", "is", null) as unknown as Promise<{
        data: Array<{ id: string; last_message_at: string | null; read_at: string | null }> | null
        error: unknown
      }>)

    if (error) throw error

    // last_message_at > read_at のものだけカウント
    const unreadCount = (data || []).filter((f) => {
      if (!f.last_message_at) return false
      if (!f.read_at) return true
      return new Date(f.last_message_at) > new Date(f.read_at)
    }).length

    // 未読の友だちIDリストも返す
    const unreadFriendIds = (data || [])
      .filter((f) => {
        if (!f.last_message_at) return false
        if (!f.read_at) return true
        return new Date(f.last_message_at) > new Date(f.read_at)
      })
      .map((f) => f.id)

    return NextResponse.json({ unreadCount, unreadFriendIds })
  } catch (error) {
    console.error("Unread count error:", error)
    return NextResponse.json({ error: "未読数の取得に失敗しました" }, { status: 500 })
  }
}
