import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    switch (type) {
      case "friend_trend":
        return NextResponse.json(await getFriendTrend(supabase, orgId))
      case "seminar_stats":
        return NextResponse.json(await getSeminarStats(supabase, orgId))
      case "member_pipeline":
        return NextResponse.json(await getMemberPipeline(supabase, orgId))
      case "recent_activities":
        return NextResponse.json(await getRecentActivities(supabase, orgId))
      default:
        return NextResponse.json({ error: "無効なタイプです" }, { status: 400 })
    }
  } catch (error) {
    console.error("Dashboard chart data error:", error)
    return NextResponse.json({ error: "チャートデータの取得に失敗しました" }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFriendTrend(supabase: any, orgId: string) {
  const months: { month: string; count: number }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthLabel = `${start.getMonth() + 1}月`

    const { count } = await supabase
      .from("friends")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .lt("first_added_at", end.toISOString())

    months.push({ month: monthLabel, count: count || 0 })
  }

  return months
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSeminarStats(supabase: any, orgId: string) {
  const { data: seminars } = await supabase
    .from("seminars")
    .select("id, title")
    .eq("organization_id", orgId)
    .order("event_date", { ascending: false })
    .limit(6)

  if (!seminars || seminars.length === 0) return []

  const results = await Promise.all(
    seminars.map(async (seminar: { id: string; title: string }) => {
      const [applied, attended] = await Promise.all([
        supabase
          .from("attendances")
          .select("*", { count: "exact", head: true })
          .eq("seminar_id", seminar.id),
        supabase
          .from("attendances")
          .select("*", { count: "exact", head: true })
          .eq("seminar_id", seminar.id)
          .eq("status", "attended"),
      ])

      return {
        name: seminar.title.length > 10
          ? seminar.title.slice(0, 10) + "…"
          : seminar.title,
        applied: applied.count || 0,
        attended: attended.count || 0,
      }
    })
  )

  return results.reverse()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMemberPipeline(supabase: any, orgId: string) {
  const stages = [
    { stage: "入会", status: "active" },
    { stage: "活動中", status: "active" },
    { stage: "お見合い", status: "omiai" },
    { stage: "交際", status: "dating" },
    { stage: "成婚", status: "married" },
  ]

  const results = await Promise.all(
    stages.map(async ({ stage, status }) => {
      if (stage === "入会") {
        const { count } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)

        return { stage, count: count || 0 }
      }

      const { count } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", status)

      return { stage, count: count || 0 }
    })
  )

  return results
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRecentActivities(supabase: any, orgId: string) {
  const [messageLogsResult, attendancesResult, friendsResult] = await Promise.all([
    supabase
      .from("message_logs")
      .select("id, message_type, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("attendances")
      .select("id, status, created_at, seminars(title)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("friends")
      .select("id, display_name, first_added_at")
      .eq("organization_id", orgId)
      .order("first_added_at", { ascending: false })
      .limit(10),
  ])

  type ActivityItem = {
    id: string
    type: string
    message: string
    timestamp: string
  }

  const activities: ActivityItem[] = []

  if (messageLogsResult.data) {
    for (const log of messageLogsResult.data) {
      activities.push({
        id: `msg-${log.id}`,
        type: log.message_type === "broadcast" ? "broadcast_sent" : "message_sent",
        message:
          log.message_type === "broadcast"
            ? "一斉配信を送信しました"
            : "メッセージを送信しました",
        timestamp: log.created_at,
      })
    }
  }

  if (attendancesResult.data) {
    for (const att of attendancesResult.data) {
      const seminarTitle =
        (att.seminars as { title?: string } | null)?.title ?? "セミナー"
      activities.push({
        id: `att-${att.id}`,
        type: "seminar_applied",
        message: `「${seminarTitle}」に申込がありました`,
        timestamp: att.created_at,
      })
    }
  }

  if (friendsResult.data) {
    for (const friend of friendsResult.data) {
      activities.push({
        id: `friend-${friend.id}`,
        type: "friend_added",
        message: `${friend.display_name || "新しいユーザー"}が友だち追加しました`,
        timestamp: friend.first_added_at,
      })
    }
  }

  // Sort by timestamp descending and take top 20
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return activities.slice(0, 20)
}
