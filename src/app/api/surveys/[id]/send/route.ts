import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessageBatch } from "@/lib/line/client"
import { createSingleQuestionMessage } from "@/lib/line/flex-templates"
import { fetchTargetFriendsForBroadcast } from "@/lib/broadcasts/targeting"

export const maxDuration = 300

// スタンドアロンアンケート送信
//
// 配信対象の計算は配信機能（broadcasts）と同じ共通 helper に統一する。
// これにより以下が自動的に得られる:
//   - includeTagIds (AND): 指定タグを全て持つ友だちのみ
//   - excludeTagIds (NOT): 指定タグを一つでも持つ友だちは除外
//   - legacy tagIds (OR): 互換性維持
//   - 1000 行上限を回避するページネーション
//   - friend_id の重複排除
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
      targetFilter?: {
        tagIds?: string[]
        includeTagIds?: string[]
        excludeTagIds?: string[]
        seminarId?: string
      }
    }

    // タグ指定のときは含む/除外/legacy のいずれかが必須（誤配信防止）
    if (targetType === "tag") {
      const tf = targetFilter || {}
      const hasInclude =
        (tf.includeTagIds && tf.includeTagIds.length > 0) ||
        (tf.tagIds && tf.tagIds.length > 0)
      const hasExclude = tf.excludeTagIds && tf.excludeTagIds.length > 0
      if (!hasInclude && !hasExclude) {
        return NextResponse.json(
          {
            error:
              "タグ指定送信には、含むタグまたは除外タグを 1 つ以上指定してください",
          },
          { status: 400 }
        )
      }
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

    // 送信対象を共通 helper で取得
    const normalizedTargetType =
      targetType === "tag" || targetType === "seminar" ? targetType : "all"
    const targetFriends = await fetchTargetFriendsForBroadcast(
      admin,
      orgId,
      normalizedTargetType,
      (targetFilter || null) as {
        tagIds?: string[]
        includeTagIds?: string[]
        excludeTagIds?: string[]
        seminarId?: string
      } | null,
      { statusFilter: "active" }
    )

    if (targetFriends.length === 0) {
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

    const userIds = targetFriends.map((f) => f.line_user_id)

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
