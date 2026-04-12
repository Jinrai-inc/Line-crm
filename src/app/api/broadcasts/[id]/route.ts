import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

export const maxDuration = 60

interface BroadcastRow {
  id: string
  organization_id: string
  title: string | null
  message_text: string | null
  target_type: string
  target_filter: { tagIds?: string[]; seminarId?: string } | null
  status: string
  sent_count: number | null
  failed_count: number | null
  sent_at: string | null
  created_at: string
}

interface FriendRow {
  id: string
  line_user_id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
  status: string
}

// 配信詳細 + 送信済み / 未送信 の内訳取得
//
// message_logs に event_type="message_send" + raw_event.broadcast_id を入れて
// いるので、対象友だち一覧と照合することで「この配信を受信した人」と「まだ
// 受信していない人」を正確に仕分けできる。
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    // 1. 配信レコード取得
    const { data: broadcastData, error: bErr } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (bErr || !broadcastData) {
      return NextResponse.json(
        { error: "配信が見つかりません" },
        { status: 404 }
      )
    }
    const broadcast = broadcastData as BroadcastRow

    // 2. 対象となる友だち一覧を計算（配信時と同じロジック）
    let friendQuery = supabase
      .from("friends")
      .select("id, line_user_id, display_name, custom_name, picture_url, status")
      .eq("organization_id", orgId)
      .eq("status", "active")

    if (
      broadcast.target_type === "tag" &&
      broadcast.target_filter?.tagIds &&
      Array.isArray(broadcast.target_filter.tagIds) &&
      broadcast.target_filter.tagIds.length > 0
    ) {
      const { data: taggedFriends } = await supabase
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", broadcast.target_filter.tagIds)
      const friendIds = (taggedFriends || [])
        .map((ft: { friend_id: string | null }) => ft.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        friendQuery = friendQuery.eq("id", "00000000-0000-0000-0000-000000000000")
      }
    } else if (
      broadcast.target_type === "seminar" &&
      broadcast.target_filter?.seminarId
    ) {
      const { data: attendances } = await supabase
        .from("attendances")
        .select("friend_id")
        .eq("seminar_id", broadcast.target_filter.seminarId)
        .neq("status", "cancelled")
      const friendIds = (attendances || [])
        .map((a: { friend_id: string | null }) => a.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        friendQuery = friendQuery.eq("id", "00000000-0000-0000-0000-000000000000")
      }
    }
    // "all" の場合は絞り込みなし

    const { data: friendsData } = await friendQuery
    const targetFriends = (friendsData || []) as FriendRow[]

    // 3. この配信の受信ログを取得（raw_event.broadcast_id で絞り込み）
    // JSONB -> テキスト比較 は Supabase の filter で可能
    const { data: logsData } = await supabase
      .from("message_logs")
      .select("friend_id, line_user_id, created_at")
      .eq("organization_id", orgId)
      .eq("event_type", "message_send")
      .filter("raw_event->>broadcast_id", "eq", id)

    const deliveredFriendIds = new Set<string>()
    const deliveredLineUserIds = new Set<string>()
    for (const log of (logsData || []) as Array<{
      friend_id: string | null
      line_user_id: string | null
    }>) {
      if (log.friend_id) deliveredFriendIds.add(log.friend_id)
      if (log.line_user_id) deliveredLineUserIds.add(log.line_user_id)
    }

    // 4. 友だち単位で受信済み / 未送信 に仕分け
    const sent: FriendRow[] = []
    const unsent: FriendRow[] = []
    for (const f of targetFriends) {
      const isDelivered =
        deliveredFriendIds.has(f.id) || deliveredLineUserIds.has(f.line_user_id)
      if (isDelivered) {
        sent.push(f)
      } else {
        unsent.push(f)
      }
    }

    // 並び順: 名前（あ→わ）
    const nameKey = (f: FriendRow) =>
      (f.custom_name || f.display_name || "").toLocaleLowerCase()
    sent.sort((a, b) => nameKey(a).localeCompare(nameKey(b)))
    unsent.sort((a, b) => nameKey(a).localeCompare(nameKey(b)))

    return NextResponse.json({
      data: {
        broadcast,
        totalTarget: targetFriends.length,
        sentCount: sent.length,
        unsentCount: unsent.length,
        sent,
        unsent,
      },
    })
  } catch (error) {
    console.error("Broadcast detail GET error:", error)
    return NextResponse.json(
      { error: "配信詳細の取得に失敗しました" },
      { status: 500 }
    )
  }
}
