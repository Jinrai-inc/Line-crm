import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// =============================================================================
// 「未対応」友だちの取得
//
// 未対応 = 以下のいずれかのイベントが起きていて、その後に運営者からの
// 手動返信（個別チャットからの message_send）がまだ送られていない友だち。
//
//   1. followup_response: フォローアップボタン（例: 「個別相談希望」）を押した
//   2. seminar_already_applied: 「すでにお申込み済み」の自動返信が送られた
//      (キャンセルしたいのに再申込ができないケース)
//
// 手動返信の判定:
//   event_type = "message_send" かつ raw_event の broadcast_id / survey_id が
//   どちらも存在しない → 個別チャットからの手動送信と判定
//
// レスポンス: { unhandledCount, unhandledFriendIds, byReason }
// =============================================================================
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    const admin = createAdminClient()

    // 1. 「対応を要求する」イベントのログを取得
    //    friend_id ごとに「最新の未対応イベント発生時刻」を求める
    const { data: pendingData, error: pendingErr } = await admin
      .from("message_logs")
      .select("friend_id, created_at, event_type")
      .eq("organization_id", orgId)
      .in("event_type", ["followup_response", "seminar_already_applied"])
      .not("friend_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000)

    if (pendingErr) {
      console.error("[friends/unhandled] pending query failed", pendingErr)
      return NextResponse.json(
        { unhandledCount: 0, unhandledFriendIds: [], byReason: {} },
        { status: 200 }
      )
    }

    const latestPendingByFriend = new Map<
      string,
      { time: Date; eventType: string }
    >()
    for (const log of (pendingData || []) as Array<{
      friend_id: string | null
      created_at: string
      event_type: string
    }>) {
      if (!log.friend_id) continue
      const t = new Date(log.created_at)
      const prev = latestPendingByFriend.get(log.friend_id)
      if (!prev || t > prev.time) {
        latestPendingByFriend.set(log.friend_id, {
          time: t,
          eventType: log.event_type,
        })
      }
    }

    const friendIds = Array.from(latestPendingByFriend.keys())
    if (friendIds.length === 0) {
      return NextResponse.json({
        unhandledCount: 0,
        unhandledFriendIds: [],
        byReason: { followup_response: 0, seminar_already_applied: 0 },
      })
    }

    // 2. 対象の friend_id について、手動返信(= 個別チャットからの message_send)
    //    の最新時刻を取得する。
    //    手動返信 = event_type="message_send" かつ raw_event が null または
    //    broadcast_id / survey_id が無い状態。
    const latestManualReplyByFriend = new Map<string, Date>()
    const BATCH = 500
    for (let i = 0; i < friendIds.length; i += BATCH) {
      const batch = friendIds.slice(i, i + BATCH)
      const { data: replyData, error: replyErr } = await admin
        .from("message_logs")
        .select("friend_id, created_at, raw_event")
        .eq("organization_id", orgId)
        .eq("event_type", "message_send")
        .in("friend_id", batch)
        .order("created_at", { ascending: false })

      if (replyErr) {
        console.error("[friends/unhandled] reply query failed", replyErr)
        continue
      }

      for (const log of (replyData || []) as Array<{
        friend_id: string | null
        created_at: string
        raw_event: Record<string, unknown> | null
      }>) {
        if (!log.friend_id) continue
        // 配信 / アンケート送信の自動メッセージは手動返信として扱わない
        const raw = log.raw_event || {}
        if (raw.broadcast_id || raw.survey_id) continue

        const t = new Date(log.created_at)
        const prev = latestManualReplyByFriend.get(log.friend_id)
        if (!prev || t > prev) {
          latestManualReplyByFriend.set(log.friend_id, t)
        }
      }
    }

    // 3. 「未対応」= 最新 pending 時刻より後に手動返信が無い友だち
    const unhandledFriendIds: string[] = []
    const reasonCount: Record<string, number> = {
      followup_response: 0,
      seminar_already_applied: 0,
    }
    for (const [friendId, { time: pendingTime, eventType }] of latestPendingByFriend) {
      const manualTime = latestManualReplyByFriend.get(friendId)
      if (!manualTime || manualTime < pendingTime) {
        unhandledFriendIds.push(friendId)
        if (reasonCount[eventType] !== undefined) {
          reasonCount[eventType] += 1
        }
      }
    }

    // 4. active 友だちだけに絞り込む（ブロック / 解除済みは表示しない）
    //    大量 ID に備えてバッチ処理
    const activeUnhandled = new Set<string>()
    if (unhandledFriendIds.length > 0) {
      for (let i = 0; i < unhandledFriendIds.length; i += BATCH) {
        const batch = unhandledFriendIds.slice(i, i + BATCH)
        const { data: activeFriends } = await admin
          .from("friends")
          .select("id")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .in("id", batch)
        for (const f of (activeFriends || []) as Array<{ id: string }>) {
          activeUnhandled.add(f.id)
        }
      }
    }

    // active 以外は除外されているので、reasonCount も実際に active な分だけに補正
    const filteredReasonCount: Record<string, number> = {
      followup_response: 0,
      seminar_already_applied: 0,
    }
    for (const [friendId, { eventType }] of latestPendingByFriend) {
      if (!activeUnhandled.has(friendId)) continue
      if (filteredReasonCount[eventType] !== undefined) {
        filteredReasonCount[eventType] += 1
      }
    }
    // reasonCount は使わなくなったので破棄（コード上の参照はない）
    void reasonCount

    const result = Array.from(activeUnhandled)

    return NextResponse.json({
      unhandledCount: result.length,
      unhandledFriendIds: result,
      byReason: filteredReasonCount,
    })
  } catch (error) {
    console.error("[friends/unhandled] handler error", error)
    return NextResponse.json(
      { unhandledCount: 0, unhandledFriendIds: [], byReason: {} },
      { status: 200 }
    )
  }
}
