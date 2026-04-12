import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import {
  fetchTargetFriendsForBroadcast,
  fetchDeliveryLogsForBroadcast,
  type FetchedFriend,
} from "@/lib/broadcasts/targeting"

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

// 配信詳細 + 送信済み / 未送信 の内訳 + 整合性チェック
//
// message_logs に event_type="message_send" + raw_event.broadcast_id を入れて
// いるので、対象友だち一覧と照合することで「この配信を受信した人」と「まだ
// 受信していない人」を正確に仕分けできる。
//
// さらに「本当に全員に届いたか」を監査できるように、
//   - 配信時の sent_count（送信成功と記録された数）
//   - 現在の対象（active 友だち数）
//   - 現在の対象（status 関係なく tag/seminar 条件を満たす友だち総数）
//   - 個別ログに記録されている数
// を併記し、差分があれば integrityIssues に warning を詰めて返す。
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 読み書き共に admin クライアントで行う（webhook の message_logs
    // 挿入と整合を取る）。組織境界は .eq("organization_id", orgId) で担保。
    const supabase = createAdminClient()

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
    const targetType = (broadcast.target_type === "tag" || broadcast.target_type === "seminar")
      ? broadcast.target_type
      : "all"

    // 2. 現在の対象友だち一覧を取得（active のみ）— ページネーション対応
    const activeTargetFriends = await fetchTargetFriendsForBroadcast(
      supabase,
      orgId,
      targetType,
      broadcast.target_filter,
      { statusFilter: "active" }
    )

    // 3. 参考: status 関係なく tag/seminar 条件に一致する友だち総数
    // （active だけでなく blocked / unfollowed も含む）
    // ブロック / 解除されている友だちがどれだけいるかを把握するために取得する。
    const allTargetFriends = await fetchTargetFriendsForBroadcast(
      supabase,
      orgId,
      targetType,
      broadcast.target_filter,
      { statusFilter: null }
    )

    // 4. この配信の受信ログを全件取得（raw_event.broadcast_id で絞り込み、ページネーション対応）
    const logsData = await fetchDeliveryLogsForBroadcast(supabase, orgId, id)

    const deliveredFriendIds = new Set<string>()
    const deliveredLineUserIds = new Set<string>()
    for (const log of logsData) {
      if (log.friend_id) deliveredFriendIds.add(log.friend_id)
      if (log.line_user_id) deliveredLineUserIds.add(log.line_user_id)
    }

    // 5. 現在の active 対象友だちを受信済み / 未送信 に仕分け
    const sent: FetchedFriend[] = []
    const unsent: FetchedFriend[] = []
    for (const f of activeTargetFriends) {
      const isDelivered =
        deliveredFriendIds.has(f.id) || deliveredLineUserIds.has(f.line_user_id)
      if (isDelivered) {
        sent.push(f)
      } else {
        unsent.push(f)
      }
    }

    // 並び順: 名前（あ→わ）
    const nameKey = (f: FetchedFriend) =>
      (f.custom_name || f.display_name || "").toLocaleLowerCase()
    sent.sort((a, b) => nameKey(a).localeCompare(nameKey(b)))
    unsent.sort((a, b) => nameKey(a).localeCompare(nameKey(b)))

    // 6. 整合性チェック
    // 各数値:
    //   - targetTotalAll: tag/seminar 条件を満たす全友だち（status 問わず）
    //   - targetActiveCount: うち status=active
    //   - targetNonActiveCount: うち active でない（blocked / unfollowed）
    //   - broadcastSentCount: broadcasts.sent_count（配信時に fulfilled と判定された数）
    //   - deliveryLogCount: message_logs に記録されている個別ログ件数（友だち単位で dedup）
    //   - liveSentMatchCount: 現在の active 対象の中で ログあり
    //   - liveUnsentCount: 現在の active 対象の中で ログなし
    const broadcastSentCount = broadcast.sent_count ?? 0
    const broadcastFailedCount = broadcast.failed_count ?? 0
    const deliveredFriendSet = new Set<string>()
    for (const fid of deliveredFriendIds) deliveredFriendSet.add(fid)
    const deliveryLogCount = deliveredFriendSet.size

    const integrityIssues: Array<{ code: string; severity: "info" | "warning" | "error"; message: string }> = []

    // タグ/セミナー条件を満たす友だちの active 率
    const targetNonActiveCount = allTargetFriends.length - activeTargetFriends.length
    if (targetNonActiveCount > 0) {
      integrityIssues.push({
        code: "non_active_in_target",
        severity: "info",
        message: `タグ/対象条件を満たす友だちのうち ${targetNonActiveCount} 人は active ではないため配信対象外です（ブロック / 友だち解除済み）`,
      })
    }

    // 配信時の sent_count と 現在の個別ログ数のずれ
    if (broadcast.status === "sent" && broadcastSentCount !== deliveryLogCount) {
      const diff = broadcastSentCount - deliveryLogCount
      if (diff > 0) {
        integrityIssues.push({
          code: "sent_count_gt_log",
          severity: "warning",
          message: `配信時の送信成功数 ${broadcastSentCount} に対し、個別履歴に記録されているのは ${deliveryLogCount} 件です（${diff} 件分の履歴が欠落）。旧実装で送信された配信の場合は「履歴に反映」ボタンで補填できます。`,
        })
      } else {
        integrityIssues.push({
          code: "log_gt_sent_count",
          severity: "info",
          message: `個別履歴の記録数 ${deliveryLogCount} 件が配信時の送信成功数 ${broadcastSentCount} を超えています（${-diff} 件多い）。「履歴に反映」の結果が含まれている可能性があります。`,
        })
      }
    }

    // 配信時の failed_count があれば警告
    if (broadcast.status === "sent" && broadcastFailedCount > 0) {
      integrityIssues.push({
        code: "broadcast_had_failures",
        severity: "warning",
        message: `配信時に ${broadcastFailedCount} 件の送信失敗が記録されています。ブロック / 友だち解除されている可能性が高いので「到達確認」で精査してください。`,
      })
    }

    // 現時点で未送信の active 友だちが残っていれば警告
    if (unsent.length > 0) {
      integrityIssues.push({
        code: "active_unsent_exists",
        severity: "warning",
        message: `現時点で配信条件を満たす active 友だちのうち ${unsent.length} 人の個別履歴が存在しません。配信後にタグ付け/友だち追加された可能性があります。「履歴に反映」または再配信を検討してください。`,
      })
    }

    // 全部一致していれば OK マーク
    if (integrityIssues.length === 0 && broadcastSentCount > 0) {
      integrityIssues.push({
        code: "all_green",
        severity: "info",
        message: "配信時の送信成功数、個別履歴、現在の対象友だちの数が全て一致しています。",
      })
    }

    return NextResponse.json({
      data: {
        broadcast,
        // 既存フィールド（UI 互換）
        totalTarget: activeTargetFriends.length,
        sentCount: sent.length,
        unsentCount: unsent.length,
        sent,
        unsent,
        // 整合性チェック（新規）
        integrity: {
          targetTotalAll: allTargetFriends.length,
          targetActiveCount: activeTargetFriends.length,
          targetNonActiveCount,
          broadcastSentCount,
          broadcastFailedCount,
          deliveryLogCount,
          liveSentMatchCount: sent.length,
          liveUnsentCount: unsent.length,
          issues: integrityIssues,
        },
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
