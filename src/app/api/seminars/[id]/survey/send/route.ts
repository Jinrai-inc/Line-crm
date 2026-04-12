import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessageBatch } from "@/lib/line/client"
import { createSurveyMessage } from "@/lib/line/flex-templates"
import { fetchTargetFriendsForBroadcast } from "@/lib/broadcasts/targeting"

export const maxDuration = 300

// セミナーアンケート一斉送信
//
// 配信対象は配信機能 (broadcasts) と同じ共通 helper に統一する。
// includeTagIds (AND) / excludeTagIds (NOT) / legacy tagIds (OR) を
// すべてサポートし、1000 行上限の影響も受けない。
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
      targetFilter?: {
        tagIds?: string[]
        includeTagIds?: string[]
        excludeTagIds?: string[]
        seminarId?: string
      }
    }

    // タグ指定のときは含む/除外/legacy のいずれかが必須
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
    // 4 系統:
    //   1) friendIds 明示指定: 個別選択モード（友だち詳細から送る等）
    //   2) targetType="all": 全 active 友だち
    //   3) targetType="tag": 共通 helper でタグ条件処理
    //   4) デフォルト（指定なし）: このセミナーの参加者全員
    let targetFriends: { line_user_id: string }[]
    if (friendIds && friendIds.length > 0) {
      // 友だちID 明示指定（バッチで取得）
      const collected: { line_user_id: string }[] = []
      const BATCH = 500
      for (let i = 0; i < friendIds.length; i += BATCH) {
        const idBatch = friendIds.slice(i, i + BATCH)
        const { data } = await admin
          .from("friends")
          .select("line_user_id")
          .eq("organization_id", orgId)
          .in("id", idBatch)
        for (const row of (data || []) as Array<{ line_user_id: string }>) {
          collected.push(row)
        }
      }
      targetFriends = collected
    } else if (targetType === "all" || targetType === "tag") {
      const fetched = await fetchTargetFriendsForBroadcast(
        admin,
        orgId,
        targetType,
        (targetFilter || null) as {
          tagIds?: string[]
          includeTagIds?: string[]
          excludeTagIds?: string[]
          seminarId?: string
        } | null,
        { statusFilter: "active" }
      )
      targetFriends = fetched.map((f) => ({ line_user_id: f.line_user_id }))
    } else {
      // デフォルト：このセミナーの参加者全員（cancelled を除く）
      const fetched = await fetchTargetFriendsForBroadcast(
        admin,
        orgId,
        "seminar",
        { seminarId: id },
        { statusFilter: "active" }
      )
      targetFriends = fetched.map((f) => ({ line_user_id: f.line_user_id }))
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
