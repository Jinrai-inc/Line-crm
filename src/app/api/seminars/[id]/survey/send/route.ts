import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessageBatch } from "@/lib/line/client"
import { createSurveyMessage } from "@/lib/line/flex-templates"

export const maxDuration = 60

// アンケート一斉送信
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
    const { friendIds, targetType, targetFilter } = body as {
      friendIds?: string[]
      targetType?: string
      targetFilter?: { tagIds?: string[]; seminarId?: string }
    }

    // LINE設定取得
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("channel_access_token")
      .eq("organization_id", orgId)
      .single()

    if (!lineAccount?.channel_access_token) {
      return NextResponse.json({ error: "LINE設定が見つかりません" }, { status: 404 })
    }

    // アンケート取得
    const { data: survey } = await (admin
      .from("seminar_surveys" as never)
      .select("*")
      .eq("seminar_id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: { title: string; questions: string } | null; error: unknown }>)

    if (!survey) {
      return NextResponse.json({ error: "アンケートが見つかりません" }, { status: 404 })
    }

    // セミナー取得
    const { data: seminar } = await admin
      .from("seminars")
      .select("title")
      .eq("id", id)
      .single()

    const questions = JSON.parse(survey.questions || "[]")

    // 送信対象取得
    let targetFriends: { line_user_id: string }[]
    if (friendIds && friendIds.length > 0) {
      const { data } = await admin
        .from("friends")
        .select("line_user_id")
        .eq("organization_id", orgId)
        .in("id", friendIds)
      targetFriends = data || []
    } else if (targetType === "all") {
      // 全友だち
      const { data } = await admin
        .from("friends")
        .select("line_user_id")
        .eq("organization_id", orgId)
        .eq("status", "active")
      targetFriends = data || []
    } else if (targetType === "tag" && targetFilter?.tagIds?.length) {
      // タグ指定
      const { data: taggedFriends } = await admin
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", targetFilter.tagIds)
      const friendIdList = (taggedFriends || []).map((ft: { friend_id: string | null }) => ft.friend_id).filter((fid): fid is string => fid !== null)
      if (friendIdList.length > 0) {
        const { data } = await admin
          .from("friends")
          .select("line_user_id")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .in("id", friendIdList)
        targetFriends = data || []
      } else {
        targetFriends = []
      }
    } else {
      // デフォルト：セミナー参加者全員
      const { data: attendances } = await admin
        .from("attendances")
        .select("friends:friend_id(line_user_id)")
        .eq("seminar_id", id)
        .neq("status", "cancelled")

      targetFriends = (attendances || [])
        .map((a: Record<string, unknown>) => {
          const f = a.friends as { line_user_id: string } | null
          return f ? { line_user_id: f.line_user_id } : null
        })
        .filter((f): f is { line_user_id: string } => f !== null)
    }

    // アンケートFlex Message作成
    const surveyMessage = createSurveyMessage({
      seminarId: id,
      seminarTitle: seminar?.title || "セミナー",
      surveyTitle: survey.title,
      questions,
    })

    const userIds = targetFriends.map((f) => f.line_user_id)

    // 並列バッチ送信（10件同時、リトライ付き）
    const { sentCount, failedCount } = await pushMessageBatch(
      userIds,
      [surveyMessage],
      { accessToken: lineAccount.channel_access_token },
      10
    )

    return NextResponse.json({ sentCount, failedCount })
  } catch (error) {
    console.error("Survey send error:", error)
    return NextResponse.json({ error: "アンケートの送信に失敗しました" }, { status: 500 })
  }
}
