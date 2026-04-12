import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { fetchTargetFriendsForBroadcast } from "@/lib/broadcasts/targeting"

export const maxDuration = 300

// 過去の配信を個別メッセージ履歴（message_logs）に遡って反映するエンドポイント。
//
// 修正前の配信は message_logs に一切記録されておらず、友だち詳細画面の
// 「メッセージ履歴」に配信が表示されない状態になっている。この API は、
// 配信の対象だった active 友だち全員に対して event_type="message_send" の
// レコードを一括 insert し、履歴に反映させる。
//
// raw_event.backfilled = true で「遡って復元したエントリ」であることを
// 明示している。既に同じ broadcast_id のログが存在する友だちにはスキップ
// するため、何度実行しても重複しない（冪等）。
//
// 本 API は LINE API を一切呼ばない。送信は行わず DB の読み書きのみ。
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // サーバー側の DB 書き込みは RLS をバイパスするため admin クライアントを使う。
    // webhook 由来のログ挿入と整合を取り、RLS のサブクエリ評価が絡む silent failure を回避する。
    // 組織境界は明示的な .eq("organization_id", orgId) で担保している。
    const supabase = createAdminClient()

    // 1. 配信レコード取得
    const { data: broadcast, error: bErr } = await supabase
      .from("broadcasts")
      .select("id, title, message_text, target_type, target_filter, sent_at, created_at")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (bErr || !broadcast) {
      return NextResponse.json(
        { error: "配信が見つかりません" },
        { status: 404 }
      )
    }

    const targetType = (broadcast as { target_type: string }).target_type
    const targetFilter = (broadcast as { target_filter: { tagIds?: string[]; seminarId?: string } | null }).target_filter
    const messageText = (broadcast as { message_text: string | null }).message_text
    const title = (broadcast as { title: string | null }).title
    const broadcastSentAt =
      (broadcast as { sent_at: string | null }).sent_at ||
      (broadcast as { created_at: string }).created_at

    // 2. 対象友だち一覧を復元（共通 helper にページネーションと重複排除を委譲）
    // status フィルタは掛けない：過去配信時点で active だった友だちが
    // その後 blocked / unfollowed に flip されていても履歴に反映させるため。
    const normalizedTargetType =
      targetType === "tag" || targetType === "seminar" ? targetType : "all"
    const allCandidates = await fetchTargetFriendsForBroadcast(
      supabase,
      orgId,
      normalizedTargetType,
      targetFilter,
      { statusFilter: null }
    )

    // first_added_at <= broadcast.sent_at で、配信より後に追加された
    // 新しい友だちに誤って履歴が入らないようにフィルタする。
    // helper は first_added_at を返さないので、ID リストに対して再度クエリする。
    const candidateIds = allCandidates.map((f) => f.id)
    const eligibleIds = new Set<string>()
    if (candidateIds.length > 0) {
      const BATCH = 500
      for (let i = 0; i < candidateIds.length; i += BATCH) {
        const idBatch = candidateIds.slice(i, i + BATCH)
        const { data: filtered } = await supabase
          .from("friends")
          .select("id")
          .eq("organization_id", orgId)
          .in("id", idBatch)
          .lte("first_added_at", broadcastSentAt)
        for (const row of (filtered || []) as Array<{ id: string }>) {
          eligibleIds.add(row.id)
        }
      }
    }

    const targetFriends = allCandidates.filter((f) => eligibleIds.has(f.id))

    if (targetFriends.length === 0) {
      return NextResponse.json({
        insertedCount: 0,
        skippedCount: 0,
        targetCount: 0,
        message: "対象友だちがいません",
      })
    }

    // 3. 既に message_logs に入っているエントリを取得（冪等性のため）
    // .filter() の column 引数は厳格に型付けされているため、JSONB パス式を渡すときは
    // never にキャストして型チェックを回避する。
    const { data: existingLogs } = await (supabase
      .from("message_logs")
      .select("friend_id, line_user_id")
      .eq("organization_id", orgId)
      .eq("event_type", "message_send")
      .filter("raw_event->>broadcast_id" as never, "eq", id) as unknown as Promise<{
        data: Array<{ friend_id: string | null; line_user_id: string | null }> | null
        error: unknown
      }>)

    const existingFriendIds = new Set<string>()
    const existingLineUserIds = new Set<string>()
    for (const log of (existingLogs || []) as Array<{
      friend_id: string | null
      line_user_id: string | null
    }>) {
      if (log.friend_id) existingFriendIds.add(log.friend_id)
      if (log.line_user_id) existingLineUserIds.add(log.line_user_id)
    }

    // 4. 未登録の友だちだけを insert
    const toInsert = targetFriends.filter(
      (f) => !existingFriendIds.has(f.id) && !existingLineUserIds.has(f.line_user_id)
    )

    const skippedCount = targetFriends.length - toInsert.length

    if (toInsert.length === 0) {
      return NextResponse.json({
        insertedCount: 0,
        skippedCount,
        targetCount: targetFriends.length,
        message: "既に履歴に反映されています",
      })
    }

    const content = messageText || title || "[配信メッセージ]"
    const rows = toInsert.map((f) => ({
      organization_id: orgId,
      friend_id: f.id,
      line_user_id: f.line_user_id,
      event_type: "message_send",
      message_type: "text",
      content,
      raw_event: { broadcast_id: id, backfilled: true },
    }))

    // 5. 500件ずつ bulk insert
    let insertedCount = 0
    let failedCount = 0
    const insertErrors: string[] = []
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase.from("message_logs").insert(batch)
      if (error) {
        console.error("backfill-logs insert error:", error)
        failedCount += batch.length
        const msg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error)
        if (!insertErrors.includes(msg)) insertErrors.push(msg)
      } else {
        insertedCount += batch.length
      }
    }

    // 失敗があった場合はクライアントに surface する
    if (insertedCount === 0 && failedCount > 0) {
      return NextResponse.json(
        {
          error: `履歴の反映に失敗しました: ${insertErrors.join(" / ")}`,
          insertedCount: 0,
          skippedCount,
          targetCount: targetFriends.length,
          failedCount,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      insertedCount,
      skippedCount,
      targetCount: targetFriends.length,
      failedCount,
      message: `${insertedCount}件を履歴に反映しました${skippedCount > 0 ? `（${skippedCount}件は既に反映済み）` : ""}${failedCount > 0 ? `（${failedCount}件は失敗）` : ""}`,
    })
  } catch (error) {
    console.error("backfill-logs error:", error)
    return NextResponse.json(
      { error: "履歴の反映に失敗しました" },
      { status: 500 }
    )
  }
}
