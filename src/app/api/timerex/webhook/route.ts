import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessage } from "@/lib/line/client"
import { createTimerexBookingMessage } from "@/lib/line/flex-templates"

export const runtime = "nodejs"
export const maxDuration = 30

// =============================================================================
// Timerex Webhook 受信エンドポイント
//
// Timerex 管理画面で本 URL を Webhook 通知先として登録すると、友だちが Timerex
// で予約を行った直後に Timerex がこの endpoint に POST してくる。
//
// 流れ:
//   1. 生 payload を console.log にダンプ（仕様確認・デバッグ用）
//   2. payload から friend_id / email / 名前 / 予約日時 / 予約名 を抽出
//      （Timerex の正確な payload 構造はドキュメント上明示されていないため、
//        複数の代表的なフィールド名を試して柔軟に取り出す）
//   3. 友だちを特定する（優先順位）:
//        (a) friend_id（クエリパラメータか custom field 経由で渡されたもの）
//        (b) email で friends.email を lookup
//        (c) 名前で friends.display_name / custom_name を部分一致 lookup
//   4. 該当 friend の line_user_id を取得
//   5. friend の組織の line_accounts から channel_access_token を取得
//   6. pushMessage で予約確認 Flex Message を送信
//   7. message_logs に記録（友だち詳細画面の履歴に反映）
//
// 重要: Timerex の retry を防ぐため、何があっても 200 を返す。
// 失敗の詳細は console.error / message_logs に残してログから追える状態にする。
// =============================================================================

interface ParsedBooking {
  friendId: string | null
  email: string | null
  name: string | null
  bookingTitle: string | null
  bookingDateTime: string | null
  bookingEndDateTime: string | null
  location: string | null
  hostName: string | null
  cancelUrl: string | null
}

// payload からネストされたフィールドを安全に取り出す
function extractField(obj: unknown, paths: string[]): string | null {
  if (!obj || typeof obj !== "object") return null
  for (const path of paths) {
    const parts = path.split(".")
    let cur: unknown = obj
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part]
      } else {
        cur = undefined
        break
      }
    }
    if (typeof cur === "string" && cur.trim()) return cur.trim()
  }
  return null
}

// Timerex の payload は事業者によってフィールド名が異なる可能性があるので、
// よくある名前を網羅的に試す。
function parseTimerexPayload(payload: unknown, queryParams: URLSearchParams): ParsedBooking {
  return {
    // friend_id: クエリパラメータ or payload 内の custom field
    friendId:
      queryParams.get("friend_id") ||
      extractField(payload, [
        "friend_id",
        "metadata.friend_id",
        "custom.friend_id",
        "custom_fields.friend_id",
        "guest.friend_id",
        "answers.friend_id",
        "data.friend_id",
        "data.metadata.friend_id",
      ]),
    email: extractField(payload, [
      "email",
      "guest.email",
      "guest_email",
      "attendee.email",
      "booker.email",
      "respondent.email",
      "user.email",
      "data.email",
      "data.guest.email",
      "data.attendee.email",
    ]),
    name: extractField(payload, [
      "name",
      "guest.name",
      "guest_name",
      "guest.full_name",
      "attendee.name",
      "booker.name",
      "respondent.name",
      "user.name",
      "data.name",
      "data.guest.name",
      "data.guest.full_name",
    ]),
    bookingTitle: extractField(payload, [
      "title",
      "event.name",
      "event.title",
      "calendar.name",
      "calendar.title",
      "schedule.title",
      "schedule.name",
      "data.title",
      "data.event.name",
      "data.calendar.name",
    ]),
    bookingDateTime: extractField(payload, [
      "start_at",
      "start_time",
      "start",
      "scheduled_at",
      "datetime",
      "event.start_at",
      "event.start_time",
      "schedule.start_at",
      "data.start_at",
      "data.start_time",
    ]),
    bookingEndDateTime: extractField(payload, [
      "end_at",
      "end_time",
      "end",
      "event.end_at",
      "event.end_time",
      "schedule.end_at",
      "data.end_at",
      "data.end_time",
    ]),
    location: extractField(payload, [
      "location",
      "place",
      "venue",
      "event.location",
      "schedule.location",
      "meeting_url",
      "meeting_link",
      "data.location",
      "data.meeting_url",
    ]),
    hostName: extractField(payload, [
      "host.name",
      "host_name",
      "organizer.name",
      "organizer_name",
      "owner.name",
      "user.name",
      "data.host.name",
      "data.organizer.name",
    ]),
    cancelUrl: extractField(payload, [
      "cancel_url",
      "reschedule_url",
      "manage_url",
      "event.cancel_url",
      "data.cancel_url",
      "data.manage_url",
    ]),
  }
}

// ISO datetime を日本語表記にする
function formatJpDateTime(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
    return `${yyyy}年${mm}月${dd}日(${dayOfWeek}) ${hh}:${mi}`
  } catch {
    return iso
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const url = new URL(request.url)

    // 生 payload を必ずログに残す（仕様確認とデバッグのため）
    console.log("[timerex-webhook] received POST", {
      query: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries()),
      body,
    })

    const admin = createAdminClient()

    // 受信した生 payload は必ず DB に保存する（友だちマッチングの成否に関わらず）。
    // 開発者がデバッグページ /api/timerex/debug から確認できるようにするため。
    // event_type="timerex_webhook_received" で識別。
    try {
      await admin.from("message_logs").insert({
        organization_id: null,
        friend_id: null,
        line_user_id: null,
        event_type: "timerex_webhook_received",
        message_type: "debug",
        content: "Timerex webhook payload (debug)",
        raw_event: {
          query: Object.fromEntries(url.searchParams.entries()),
          headers: Object.fromEntries(request.headers.entries()),
          body,
        },
      })
    } catch (logErr) {
      console.error("[timerex-webhook] debug log insert failed", logErr)
    }

    if (!body) {
      // body が無くても 200 を返す（test ping 等のため）
      return NextResponse.json({ received: true, reason: "empty body" })
    }

    const parsed = parseTimerexPayload(body, url.searchParams)
    console.log("[timerex-webhook] parsed", parsed)

    // ----- 1. 友だちを特定する -----
    // 注意: TypeScript の制御フロー解析が `let friend = null` を null に narrow して
    // しまうため、`typeof friend` で参照すると null として扱われてしまう。
    // 型エイリアスを外に切り出して明示的に参照する必要がある (webhook.ts の
    // greeting_settings で同じ罠にハマったのと同じパターン)。
    type MatchedFriend = {
      id: string
      line_user_id: string
      organization_id: string
      display_name: string | null
      custom_name: string | null
    }

    let friend: MatchedFriend | null = null

    // (a) friend_id があれば直接検索（最も確実）
    if (parsed.friendId) {
      const { data } = await admin
        .from("friends")
        .select("id, line_user_id, organization_id, display_name, custom_name")
        .eq("id", parsed.friendId)
        .maybeSingle()
      friend = (data as MatchedFriend | null) || null
      if (friend) console.log("[timerex-webhook] matched by friend_id", friend.id)
    }

    // (b) email で lookup
    if (!friend && parsed.email) {
      const { data } = await admin
        .from("friends")
        .select("id, line_user_id, organization_id, display_name, custom_name")
        .eq("email", parsed.email)
        .eq("status", "active")
        .limit(1)
      if (data && data.length > 0) {
        friend = data[0] as MatchedFriend
        console.log("[timerex-webhook] matched by email", parsed.email)
      }
    }

    // (c) 名前で部分一致（最後の手段、誤マッチのリスクあり）
    if (!friend && parsed.name) {
      const escaped = parsed.name.replace(/[%_]/g, "\\$&")
      const { data } = await admin
        .from("friends")
        .select("id, line_user_id, organization_id, display_name, custom_name")
        .or(`display_name.ilike.%${escaped}%,custom_name.ilike.%${escaped}%`)
        .eq("status", "active")
        .limit(2)
      if (data && data.length === 1) {
        // 1 件だけマッチした場合のみ採用（複数マッチは曖昧なので使わない）
        friend = data[0] as MatchedFriend
        console.log("[timerex-webhook] matched by name", parsed.name)
      } else if (data && data.length > 1) {
        console.warn("[timerex-webhook] name match ambiguous, skipping", {
          name: parsed.name,
          count: data.length,
        })
      }
    }

    if (!friend) {
      console.error("[timerex-webhook] friend not found", {
        friendId: parsed.friendId,
        email: parsed.email,
        name: parsed.name,
      })
      // Timerex の retry を防ぐため 200 を返す
      return NextResponse.json({ received: true, matched: false })
    }

    // ----- 2. LINE access token を取得 -----
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("channel_access_token")
      .eq("organization_id", friend.organization_id)
      .maybeSingle()

    const channelAccessToken = (lineAccount as { channel_access_token?: string } | null)
      ?.channel_access_token
    if (!channelAccessToken) {
      console.error("[timerex-webhook] line_account not found for org", friend.organization_id)
      return NextResponse.json({ received: true, matched: true, sent: false, reason: "no line account" })
    }

    // ----- 3. LINE 通知を送信 -----
    const title = parsed.bookingTitle || "ご予約"
    const formattedDateTime = formatJpDateTime(parsed.bookingDateTime)
    const formattedEndDateTime = formatJpDateTime(parsed.bookingEndDateTime)
    // 終了時刻は開始時刻と同じ日付なら "14:40" のような時刻だけ表示する
    let endDisplay: string | null = null
    if (formattedEndDateTime && formattedDateTime) {
      // 同日なら時刻部分だけ取り出す
      const sameDay =
        parsed.bookingDateTime &&
        parsed.bookingEndDateTime &&
        parsed.bookingDateTime.slice(0, 10) === parsed.bookingEndDateTime.slice(0, 10)
      endDisplay = sameDay ? formattedEndDateTime.split(" ").pop() || formattedEndDateTime : formattedEndDateTime
    }
    const bookerName = parsed.name || friend.custom_name || friend.display_name || null

    let sent = false
    try {
      await pushMessage(
        friend.line_user_id,
        [
          createTimerexBookingMessage(title, formattedDateTime, bookerName, {
            endDatetime: endDisplay,
            location: parsed.location,
            hostName: parsed.hostName,
            cancelUrl: parsed.cancelUrl,
          }),
        ],
        { accessToken: channelAccessToken }
      )
      sent = true
      console.log("[timerex-webhook] LINE notification sent", { friendId: friend.id })
    } catch (err) {
      console.error("[timerex-webhook] pushMessage failed", err)
    }

    // ----- 4. message_logs に記録（友だち履歴に反映）-----
    try {
      const { error: logErr } = await admin.from("message_logs").insert({
        organization_id: friend.organization_id,
        friend_id: friend.id,
        line_user_id: friend.line_user_id,
        event_type: "message_send",
        message_type: "flex",
        content: `[Timerex 予約] ${title}${formattedDateTime ? ` / ${formattedDateTime}` : ""}`,
        raw_event: { source: "timerex", parsed, payload: body },
      })
      if (logErr) {
        console.error("[timerex-webhook] message_logs insert failed", logErr)
      }
    } catch (err) {
      console.error("[timerex-webhook] message_logs insert threw", err)
    }

    return NextResponse.json({
      received: true,
      matched: true,
      sent,
      friendId: friend.id,
    })
  } catch (error) {
    console.error("[timerex-webhook] handler error", error)
    // 何があっても 200 を返す（Timerex の retry storm を防ぐ）
    return NextResponse.json({ received: true, error: true })
  }
}

// ヘルスチェック / 接続テスト用
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/timerex/webhook",
    method: "POST",
    description: "Timerex Webhook receiver",
  })
}
