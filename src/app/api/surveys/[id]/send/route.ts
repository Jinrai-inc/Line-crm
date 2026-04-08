import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessageBatch } from "@/lib/line/client"
import { createSingleQuestionMessage } from "@/lib/line/flex-templates"

export const maxDuration = 300

// スタンドアロンアンケート送信
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
    const { targetType, targetFilter } = body as {
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
      .from("surveys" as never)
      .select("*")
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{
        data: { id: string; title: string; questions: string } | null
        error: unknown
      }>)

    if (!survey) {
      return NextResponse.json({ error: "アンケートが見つかりません" }, { status: 404 })
    }

    const questions = typeof survey.questions === "string"
      ? JSON.parse(survey.questions)
      : survey.questions || []

    // 送信対象取得
    let friendQuery = admin
      .from("friends")
      .select("line_user_id")
      .eq("organization_id", orgId)
      .eq("status", "active")

    if (targetType === "tag" && targetFilter?.tagIds?.length) {
      const { data: taggedFriends } = await admin
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", targetFilter.tagIds)
      const friendIds = (taggedFriends || [])
        .map((ft: { friend_id: string | null }) => ft.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        return NextResponse.json({ sentCount: 0, failedCount: 0 })
      }
    } else if (targetType === "seminar" && targetFilter?.seminarId) {
      const { data: attendances } = await admin
        .from("attendances")
        .select("friend_id")
        .eq("seminar_id", targetFilter.seminarId)
        .neq("status", "cancelled")
      const friendIds = (attendances || [])
        .map((a: { friend_id: string | null }) => a.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        return NextResponse.json({ sentCount: 0, failedCount: 0 })
      }
    }

    const { data: targetFriends } = await friendQuery

    if (!targetFriends || targetFriends.length === 0) {
      return NextResponse.json({ sentCount: 0, failedCount: 0 })
    }

    // 最初の1問目だけ送信（段階的送信）
    const firstQuestion = questions[0]
    if (!firstQuestion) {
      return NextResponse.json({ error: "質問がありません" }, { status: 400 })
    }

    const firstMessage = createSingleQuestionMessage({
      surveyId: survey.id,
      surveyTitle: survey.title,
      question: firstQuestion,
      questionIndex: 0,
      totalQuestions: questions.length,
    })

    const userIds = targetFriends.map((f: { line_user_id: string }) => f.line_user_id)

    // 並列バッチ送信（10件同時、リトライ付き）
    const { sentCount, failedCount } = await pushMessageBatch(
      userIds,
      [firstMessage],
      { accessToken: lineAccount.channel_access_token },
      10
    )

    // ステータスを published に更新
    await (admin
      .from("surveys" as never)
      .update({ status: "published", updated_at: new Date().toISOString() } as never)
      .eq("id" as never, id) as unknown as Promise<{ error: unknown }>)

    return NextResponse.json({ sentCount, failedCount })
  } catch (error) {
    console.error("Survey send error:", error)
    return NextResponse.json({ error: "アンケートの送信に失敗しました" }, { status: 500 })
  }
}
