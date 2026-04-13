import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// セミナー詳細取得
//
// 申込者一覧に対して payments テーブルから最新の決済状況を紐付けて返す。
// クライアントが「この方はお申込みで止まっているけど決済画面が送られて
// いるのか分からない」という要望に応えるため、決済リンク送信の有無、
// 決済完了の有無を UI で判別できるようにする。
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 書き込みは admin で（他の route と揃える）
    const supabase = createAdminClient()

    const { data: seminar, error } = await supabase
      .from("seminars")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (error) throw error
    if (!seminar) return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })

    // 申込者一覧
    const { data: attendeesRaw } = await supabase
      .from("attendances")
      .select("*, friends(id, display_name, custom_name, picture_url, line_user_id)")
      .eq("seminar_id", id)
      .eq("organization_id", orgId)
      .order("applied_at", { ascending: false })

    // 同じセミナーに紐付く payments を全取得して friend_id ごとの最新を算出
    // 1 人の友だちが複数回決済を試みて失敗 → 再作成するケースがあるため
    // (friend_id, seminar_id) の UNIQUE 制約はなく、最新行を取る必要がある。
    const { data: paymentsRaw } = await supabase
      .from("payments")
      .select(
        "friend_id, status, amount, paid_at, payment_link_sent, payment_link_sent_at, created_at, updated_at"
      )
      .eq("seminar_id", id)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    type PaymentRow = {
      friend_id: string | null
      status: string | null
      amount: number | null
      paid_at: string | null
      payment_link_sent: boolean | null
      payment_link_sent_at: string | null
      created_at: string | null
      updated_at: string | null
    }

    const latestPaymentByFriend = new Map<string, PaymentRow>()
    for (const p of (paymentsRaw || []) as PaymentRow[]) {
      if (!p.friend_id) continue
      // 取得時点で created_at desc なので、最初に出てきたものが最新
      if (!latestPaymentByFriend.has(p.friend_id)) {
        latestPaymentByFriend.set(p.friend_id, p)
      }
    }

    // attendees に payment 情報を merge
    type AttendanceWithFriend = Record<string, unknown> & {
      friend_id?: string | null
      friends?: { id?: string | null } | null
    }
    const attendeesWithPayment = ((attendeesRaw || []) as AttendanceWithFriend[]).map((a) => {
      const fid = a.friends?.id || a.friend_id || null
      const payment = fid ? latestPaymentByFriend.get(fid) : undefined
      return {
        ...a,
        payment: payment
          ? {
              status: payment.status, // "pending" | "paid" | "failed" | "refunded"
              amount: payment.amount,
              paid_at: payment.paid_at,
              payment_link_sent: payment.payment_link_sent,
              payment_link_sent_at: payment.payment_link_sent_at,
              created_at: payment.created_at,
            }
          : null,
      }
    })

    return NextResponse.json({
      data: { ...seminar, attendees: attendeesWithPayment },
    })
  } catch (error) {
    console.error("Seminar GET error:", error)
    return NextResponse.json({ error: "セミナー詳細の取得に失敗しました" }, { status: 500 })
  }
}

// セミナー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const body = await request.json()
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    const fields = ["title", "description", "event_date", "start_time", "end_time", "location", "location_url", "capacity", "status", "registration_deadline", "tag_ids", "payment_url", "zoom_url", "price", "post_payment_url", "zoom_note", "post_payment_message"]
    const fieldMap: Record<string, string> = {
      title: "title", description: "description", eventDate: "event_date",
      startTime: "start_time", endTime: "end_time", location: "location",
      locationUrl: "location_url", capacity: "capacity", status: "status",
      registrationDeadline: "registration_deadline", tagIds: "tag_ids",
      paymentUrl: "payment_url", zoomUrl: "zoom_url", price: "price",
      postPaymentUrl: "post_payment_url",
      zoomNote: "zoom_note",
      postPaymentMessage: "post_payment_message",
    }

    // 空文字をnullに変換すべきカラム（DB型がtext以外のもの）
    const nullableFields = new Set(["event_date", "start_time", "end_time", "registration_deadline", "price", "capacity"])

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (body[camel] !== undefined) {
        updateData[snake] = (body[camel] === "" && nullableFields.has(snake)) ? null : body[camel]
      }
    }
    // snake_case の直接指定もサポート
    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = (body[field] === "" && nullableFields.has(field)) ? null : body[field]
      }
    }

    // admin clientを使用（RLSやスキーマキャッシュの問題を回避）
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("seminars")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Seminar update error:", error, "updateData:", updateData)
      // エラー詳細を返す
      return NextResponse.json({
        error: `更新エラー: ${error.message || JSON.stringify(error)}`,
        code: error.code,
        details: error.details,
      }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Seminar PATCH error:", error)
    const msg = error instanceof Error ? error.message : "不明なエラー"
    return NextResponse.json({ error: `セミナーの更新に失敗しました: ${msg}` }, { status: 500 })
  }
}

// セミナー削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("seminars").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Seminar DELETE error:", error)
    return NextResponse.json({ error: "セミナーの削除に失敗しました" }, { status: 500 })
  }
}
