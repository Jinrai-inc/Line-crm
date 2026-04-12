import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { fetchTargetFriendsForBroadcast } from "@/lib/broadcasts/targeting"

// 配信プレビュー（対象者数の確認）
//
// 送信時と完全に同じロジックで対象友だち数を返す。これによりユーザーが
// 送信確認ダイアログで見る「対象人数」と、実際に配信される人数が一致する。
// 以前は tag パスで friend_tags の .in() が 1000 行上限で切り捨てられ、
// さらに status=active フィルタも掛かっておらず不正確な数字を返していた。
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 送信本体と同じく admin クライアント + 共通 helper を使う。
    const supabase = createAdminClient()

    const { targetType, targetFilter } = await request.json()

    const normalizedTargetType =
      targetType === "tag" || targetType === "seminar" ? targetType : "all"

    // タグ指定配信のバリデーション
    // 含むタグ／除外タグ／legacy tagIds のいずれかが指定されていない場合は
    // count=0 を返す（送信時と同じ「無効」扱い）。
    if (normalizedTargetType === "tag") {
      const tf = (targetFilter || {}) as { tagIds?: string[]; includeTagIds?: string[]; excludeTagIds?: string[] }
      const hasInclude = (tf.includeTagIds && tf.includeTagIds.length > 0)
        || (tf.tagIds && tf.tagIds.length > 0)
      const hasExclude = tf.excludeTagIds && tf.excludeTagIds.length > 0
      if (!hasInclude && !hasExclude) {
        return NextResponse.json({ count: 0 })
      }
    }

    const friends = await fetchTargetFriendsForBroadcast(
      supabase,
      orgId,
      normalizedTargetType,
      (targetFilter || null) as { tagIds?: string[]; includeTagIds?: string[]; excludeTagIds?: string[]; seminarId?: string } | null,
      { statusFilter: "active" }
    )

    return NextResponse.json({ count: friends.length })
  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json({ error: "プレビューの取得に失敗しました" }, { status: 500 })
  }
}
