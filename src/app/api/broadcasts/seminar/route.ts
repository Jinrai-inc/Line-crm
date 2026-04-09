import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessageBatch } from "@/lib/line/client"
import { createSeminarListMessage } from "@/lib/line/flex-templates"

export const maxDuration = 300

// セミナー案内を配信
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { seminarIds, targetType, targetFilter } = body

    if (!seminarIds || seminarIds.length === 0) {
      return NextResponse.json({ error: "セミナーを選択してください" }, { status: 400 })
    }

    // セミナー情報を取得
    const { data: selectedSeminars } = await admin
      .from("seminars")
      .select("id, title, event_date, start_time, end_time, location, capacity")
      .in("id", seminarIds)

    if (!selectedSeminars || selectedSeminars.length === 0) {
      return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })
    }

    // 各セミナーの申込数を取得
    const seminarInfos = await Promise.all(
      selectedSeminars.map(async (s) => {
        const { count } = await admin
          .from("attendances")
          .select("*", { count: "exact", head: true })
          .eq("seminar_id", s.id)
          .neq("status", "cancelled")
        return {
          id: s.id,
          title: s.title,
          eventDate: s.event_date,
          startTime: s.start_time?.slice(0, 5),
          endTime: s.end_time?.slice(0, 5),
          location: s.location || undefined,
          capacity: s.capacity,
          attendeeCount: count || 0,
        }
      })
    )

    const seminarMessage = createSeminarListMessage(seminarInfos)

    // LINEアカウント情報を取得
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("channel_access_token")
      .eq("organization_id", orgId)
      .single()

    if (!lineAccount?.channel_access_token) {
      return NextResponse.json({ error: "LINE設定が見つかりません" }, { status: 400 })
    }

    // 対象友だちを取得
    let friendsQuery = admin
      .from("friends")
      .select("line_user_id")
      .eq("organization_id", orgId)
      .eq("status", "active")

    if (targetType === "tag" && targetFilter?.tagIds?.length > 0) {
      const { data: taggedFriends } = await admin
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", targetFilter.tagIds)
      if (taggedFriends) {
        const friendIds = taggedFriends.map((ft: { friend_id: string | null }) => ft.friend_id).filter((id): id is string => !!id)
        if (friendIds.length > 0) friendsQuery = friendsQuery.in("id", friendIds)
      }
    } else if (targetType === "seminar" && targetFilter?.seminarId) {
      const { data: attendees } = await admin
        .from("attendances")
        .select("friend_id")
        .eq("seminar_id", targetFilter.seminarId)
        .neq("status", "cancelled")
      if (attendees) {
        const friendIds = attendees.map((a: { friend_id: string | null }) => a.friend_id).filter((id): id is string => !!id)
        if (friendIds.length > 0) friendsQuery = friendsQuery.in("id", friendIds)
      }
    }

    const { data: friends } = await friendsQuery
    if (!friends || friends.length === 0) {
      return NextResponse.json({ sentCount: 0, failedCount: 0 })
    }

    const userIds = friends.map((f: { line_user_id: string }) => f.line_user_id).filter(Boolean)

    const result = await pushMessageBatch(
      userIds,
      [seminarMessage],
      { accessToken: lineAccount.channel_access_token }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Broadcast seminar error:", error)
    return NextResponse.json({ error: "セミナー案内の送信に失敗しました" }, { status: 500 })
  }
}
