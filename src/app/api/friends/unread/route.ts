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

    // read_at カラムが DB に存在しない環境を考慮し、
    // まず read_at 付きで試し、42703 (undefined_column) なら
    // read_at 無しにフォールバックする
    let unreadCount = 0
    let unreadFriendIds: string[] = []

    // まず last_message_at がある友だちを取得
    const { data, error } = await admin
      .from("friends")
      .select("id, last_message_at")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .not("last_message_at", "is", null)

    if (error) throw error

    // read_at を別クエリで取得（カラムが無い場合にエラーにならないよう分離）
    let readAtMap = new Map<string, string>()
    try {
      const friendIds = (data || []).map((f) => f.id)
      if (friendIds.length > 0) {
        const { data: readData } = await (admin
          .from("friends")
          .select("id, read_at")
          .in("id", friendIds) as unknown as Promise<{
            data: Array<{ id: string; read_at: string | null }> | null
            error: unknown
          }>)
        if (readData) {
          readAtMap = new Map(
            readData
              .filter((r) => r.read_at)
              .map((r) => [r.id, r.read_at!])
          )
        }
      }
    } catch {
      // read_at カラムが存在しない場合はスキップ（全て未読扱い）
    }

    const unreadFriends = (data || []).filter((f) => {
      if (!f.last_message_at) return false
      const readAt = readAtMap.get(f.id)
      if (!readAt) return true
      return new Date(f.last_message_at) > new Date(readAt)
    })

    unreadCount = unreadFriends.length
    unreadFriendIds = unreadFriends.map((f) => f.id)

    return NextResponse.json({ unreadCount, unreadFriendIds })
  } catch (error) {
    console.error("Unread count error:", error)
    // 500 ではなく 200 で空結果を返す（フロントの表示を壊さない）
    return NextResponse.json({ unreadCount: 0, unreadFriendIds: [] })
  }
}
