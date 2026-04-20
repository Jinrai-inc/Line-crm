import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import * as XLSX from "xlsx"

export const maxDuration = 300

// 組織全体のデータを複数シート xlsx で一括エクスポート
// 解約時のバックアップ/他CRM移行用。友だち/タグ/セミナー/参加履歴/
// 支払い/配信/アンケート/アンケート回答/メッセージログ を含む。
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const formatDateTime = (iso: string | null | undefined): string => {
      if (!iso) return ""
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ""
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      const ss = String(d.getSeconds()).padStart(2, "0")
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    }

    // ── 1. 友だち + タグ ───────────────────────────────────
    const { data: friendsRaw } = await supabase
      .from("friends")
      .select(
        `id, line_user_id, display_name, custom_name, picture_url, status,
         email, phone, memo, first_added_at, last_message_at, created_at, updated_at,
         friend_tags(tags(id, name))`
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    const friendsSheet = (friendsRaw || []).map((f) => {
      const friendTagsRaw =
        ((f as unknown as { friend_tags?: Array<{ tags: { name?: string } | { name?: string }[] | null }> }).friend_tags) || []
      const tagNames = friendTagsRaw
        .map((ft) => {
          const t = ft.tags
          if (!t) return undefined
          if (Array.isArray(t)) return t[0]?.name
          return t.name
        })
        .filter((n): n is string => Boolean(n))
        .join(",")
      return {
        LINEユーザーID: f.line_user_id || "",
        LINE表示名: f.display_name || "",
        管理用名前: f.custom_name || "",
        プロフィール画像URL: f.picture_url || "",
        ステータス: f.status || "",
        タグ: tagNames,
        メール: f.email || "",
        電話番号: f.phone || "",
        メモ: f.memo || "",
        友だち追加日: formatDateTime(f.first_added_at as string | null),
        最終メッセージ日: formatDateTime(f.last_message_at as string | null),
        CRM登録日: formatDateTime(f.created_at as string | null),
      }
    })

    // ── 2. タグマスタ ───────────────────────────────────────
    const { data: tagsRaw } = await supabase
      .from("tags")
      .select("id, name, color, description, created_at")
      .eq("organization_id", orgId)
      .order("name", { ascending: true })

    const tagsSheet = (tagsRaw || []).map((t) => ({
      タグ名: t.name || "",
      色: t.color || "",
      説明: t.description || "",
      作成日: formatDateTime(t.created_at as string | null),
    }))

    // ── 3. セミナー ─────────────────────────────────────────
    const { data: seminarsRaw } = await supabase
      .from("seminars")
      .select("*")
      .eq("organization_id", orgId)
      .order("event_date", { ascending: false })

    const seminarsSheet = (seminarsRaw || []).map((s) => ({
      セミナーID: s.id || "",
      タイトル: s.title || "",
      説明: s.description || "",
      開催日: s.event_date || "",
      開始時刻: s.start_time || "",
      終了時刻: s.end_time || "",
      会場: s.location || "",
      定員: s.capacity ?? "",
      ステータス: s.status || "",
      参加費: s.price ?? "",
      決済リンクURL: s.payment_url || "",
      ZoomリンクURL: s.zoom_url || "",
      Zoom注釈: s.zoom_note || "",
      決済後URL: s.post_payment_url || "",
      決済後URL案内文: s.post_payment_message || "",
      作成日: formatDateTime(s.created_at as string | null),
      更新日: formatDateTime(s.updated_at as string | null),
    }))

    // ── 4. 参加履歴 (attendances) ──────────────────────────
    const { data: attendancesRaw } = await supabase
      .from("attendances")
      .select(
        `id, status, applied_at, confirmed_at, attended_at, cancelled_at,
         cancel_reason, memo,
         friends(line_user_id, display_name, custom_name),
         seminars(title, event_date)`
      )
      .eq("organization_id", orgId)
      .order("applied_at", { ascending: false })

    const attendancesSheet = (attendancesRaw || []).map((a) => {
      const friend =
        (a as unknown as { friends?: { line_user_id?: string; display_name?: string; custom_name?: string } | Array<{ line_user_id?: string; display_name?: string; custom_name?: string }> }).friends
      const seminar =
        (a as unknown as { seminars?: { title?: string; event_date?: string } | Array<{ title?: string; event_date?: string }> }).seminars
      const f = Array.isArray(friend) ? friend[0] : friend
      const s = Array.isArray(seminar) ? seminar[0] : seminar
      return {
        LINEユーザーID: f?.line_user_id || "",
        LINE表示名: f?.display_name || "",
        管理用名前: f?.custom_name || "",
        セミナー名: s?.title || "",
        開催日: s?.event_date || "",
        ステータス: a.status || "",
        申込日時: formatDateTime(a.applied_at as string | null),
        確認日時: formatDateTime(a.confirmed_at as string | null),
        出席日時: formatDateTime(a.attended_at as string | null),
        キャンセル日時: formatDateTime(a.cancelled_at as string | null),
        キャンセル理由: a.cancel_reason || "",
        メモ: a.memo || "",
      }
    })

    // ── 5. 支払い履歴 ───────────────────────────────────────
    const { data: paymentsRaw } = await supabase
      .from("payments")
      .select(
        `id, payment_type, item_name, amount, currency, status,
         stripe_checkout_session_id, stripe_payment_intent_id, stripe_receipt_url,
         paid_at, refunded_at, created_at,
         friends(line_user_id, display_name, custom_name)`
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    const paymentsSheet = (paymentsRaw || []).map((p) => {
      const friend =
        (p as unknown as { friends?: { line_user_id?: string; display_name?: string; custom_name?: string } | Array<{ line_user_id?: string; display_name?: string; custom_name?: string }> }).friends
      const f = Array.isArray(friend) ? friend[0] : friend
      return {
        支払いID: p.id || "",
        LINEユーザーID: f?.line_user_id || "",
        LINE表示名: f?.display_name || "",
        管理用名前: f?.custom_name || "",
        種別: p.payment_type || "",
        品目: p.item_name || "",
        金額: p.amount ?? "",
        通貨: p.currency || "",
        ステータス: p.status || "",
        StripeセッションID: p.stripe_checkout_session_id || "",
        Stripe支払い意図ID: p.stripe_payment_intent_id || "",
        Stripeレシート: p.stripe_receipt_url || "",
        支払日時: formatDateTime(p.paid_at as string | null),
        返金日時: formatDateTime(p.refunded_at as string | null),
        作成日時: formatDateTime(p.created_at as string | null),
      }
    })

    // ── 6. 配信履歴 ─────────────────────────────────────────
    const { data: broadcastsRaw } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    const broadcastsSheet = (broadcastsRaw || []).map((b) => ({
      配信ID: b.id || "",
      タイトル: b.title || "",
      本文: b.message_text || "",
      対象種別: b.target_type || "",
      送信成功件数: b.sent_count ?? "",
      送信失敗件数: b.failed_count ?? "",
      ステータス: b.status || "",
      予約時刻: formatDateTime(b.scheduled_at as string | null),
      送信時刻: formatDateTime(b.sent_at as string | null),
      作成日: formatDateTime(b.created_at as string | null),
    }))

    // ── 7. アンケート ───────────────────────────────────────
    const { data: surveysRaw } = await supabase
      .from("surveys")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    const surveysSheet = (surveysRaw || []).map((s) => ({
      アンケートID: s.id || "",
      タイトル: s.title || "",
      ステータス: s.status || "",
      質問内容JSON:
        typeof s.questions === "string"
          ? s.questions
          : JSON.stringify(s.questions || []),
      作成日: formatDateTime(s.created_at as string | null),
      更新日: formatDateTime(s.updated_at as string | null),
    }))

    // ── 8. アンケート回答 ───────────────────────────────────
    const { data: surveyResponsesRaw } = await supabase
      .from("survey_responses")
      .select(
        `id, survey_id, line_user_id, question_index, choice_index, answer_text, created_at,
         friends(display_name, custom_name)`
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    const surveyResponsesSheet = (surveyResponsesRaw || []).map((r) => {
      const friend =
        (r as unknown as { friends?: { display_name?: string; custom_name?: string } | Array<{ display_name?: string; custom_name?: string }> }).friends
      const f = Array.isArray(friend) ? friend[0] : friend
      return {
        回答ID: r.id || "",
        アンケートID: r.survey_id || "",
        LINEユーザーID: r.line_user_id || "",
        LINE表示名: f?.display_name || "",
        管理用名前: f?.custom_name || "",
        質問番号: r.question_index ?? "",
        選択肢番号: r.choice_index ?? "",
        回答テキスト: r.answer_text || "",
        回答日時: formatDateTime(r.created_at as string | null),
      }
    })

    // ── 9. メッセージログ (受信 + 送信) ────────────────────
    const { data: messageLogsRaw } = await supabase
      .from("message_logs")
      .select(
        `id, event_type, message_type, content, line_user_id, created_at,
         friends(display_name, custom_name)`
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10000)

    const messageLogsSheet = (messageLogsRaw || []).map((m) => {
      const friend =
        (m as unknown as { friends?: { display_name?: string; custom_name?: string } | Array<{ display_name?: string; custom_name?: string }> }).friends
      const f = Array.isArray(friend) ? friend[0] : friend
      return {
        ログID: m.id || "",
        LINEユーザーID: m.line_user_id || "",
        LINE表示名: f?.display_name || "",
        管理用名前: f?.custom_name || "",
        イベント種別: m.event_type || "",
        メッセージ種別: m.message_type || "",
        内容: m.content || "",
        日時: formatDateTime(m.created_at as string | null),
      }
    })

    // ── xlsx ワークブック構築 ───────────────────────────────
    const workbook = XLSX.utils.book_new()

    // データが無いシートも作るが、空配列だと書き出されないため最低限 header を入れる
    const appendSheet = (
      name: string,
      rows: Record<string, unknown>[]
    ) => {
      const sheet =
        rows.length > 0
          ? XLSX.utils.json_to_sheet(rows)
          : XLSX.utils.aoa_to_sheet([["(データなし)"]])
      // シート名は 31 文字制限がある
      XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31))
    }

    appendSheet("友だち一覧", friendsSheet)
    appendSheet("タグ一覧", tagsSheet)
    appendSheet("セミナー一覧", seminarsSheet)
    appendSheet("参加履歴", attendancesSheet)
    appendSheet("支払い履歴", paymentsSheet)
    appendSheet("配信履歴", broadcastsSheet)
    appendSheet("アンケート一覧", surveysSheet)
    appendSheet("アンケート回答", surveyResponsesSheet)
    appendSheet("メッセージログ", messageLogsSheet)

    // xlsx はブラウザ/Node 両対応のため type:"array" (Uint8Array) で出力する
    const arrayBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    }) as Uint8Array

    const dateStr = new Date().toISOString().split("T")[0]
    return new Response(arrayBuffer as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="line-crm-backup_${dateStr}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Organization export error:", error)
    return NextResponse.json(
      { error: "データエクスポートに失敗しました" },
      { status: 500 }
    )
  }
}
