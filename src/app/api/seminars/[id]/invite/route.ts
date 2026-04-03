import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessage } from "@/lib/line/client"
import { createSeminarListMessage } from "@/lib/line/flex-templates"

// セミナー案内送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { friendIds } = body as { friendIds: string[] }

    if (!friendIds || friendIds.length === 0) {
      return NextResponse.json({ error: "送信先を選択してください" }, { status: 400 })
    }

    // セミナー情報取得
    const { data: seminar, error: seminarError } = await admin
      .from("seminars")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (seminarError || !seminar) {
      return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })
    }

    // 現在の参加者数
    const { count: attendeeCount } = await admin
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .eq("seminar_id", id)
      .neq("status", "cancelled")

    // LINE アカウント取得
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("channel_access_token")
      .eq("organization_id", orgId)
      .limit(1)
      .single()

    if (!lineAccount?.channel_access_token) {
      return NextResponse.json({ error: "LINEアカウントが設定されていません" }, { status: 400 })
    }

    // 友だちのLINEユーザーID取得
    const { data: friends } = await admin
      .from("friends")
      .select("id, line_user_id, display_name")
      .in("id", friendIds)
      .eq("organization_id", orgId)

    if (!friends || friends.length === 0) {
      return NextResponse.json({ error: "送信先の友だちが見つかりません" }, { status: 404 })
    }

    // セミナー案内Flex Messageを作成
    const flexMsg = createSeminarListMessage([{
      id: seminar.id,
      title: seminar.title,
      eventDate: seminar.event_date,
      startTime: seminar.start_time ?? undefined,
      endTime: seminar.end_time ?? undefined,
      location: seminar.location ?? undefined,
      capacity: seminar.capacity,
      attendeeCount: attendeeCount || 0,
    }])

    // 各友だちに送信
    let sentCount = 0
    let failCount = 0
    for (const friend of friends) {
      if (!friend.line_user_id) {
        failCount++
        continue
      }
      try {
        await pushMessage(
          friend.line_user_id,
          [flexMsg],
          { accessToken: lineAccount.channel_access_token }
        )
        sentCount++
      } catch (err) {
        console.error(`Failed to send to ${friend.id}:`, err)
        failCount++
      }
    }

    return NextResponse.json({
      data: { sentCount, failCount, total: friends.length },
    })
  } catch (error) {
    console.error("Seminar invite POST error:", error)
    return NextResponse.json({ error: "案内送信に失敗しました" }, { status: 500 })
  }
}
