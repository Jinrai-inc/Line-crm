import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// セミナー詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { data: seminar, error } = await supabase
      .from("seminars")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!seminar) return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })

    // 申込者一覧
    const { data: attendees } = await supabase
      .from("attendances")
      .select("*, friends(id, display_name, custom_name, picture_url, line_user_id)")
      .eq("seminar_id", id)
      .order("applied_at", { ascending: false })

    // 決済情報をセミナー単位で取得し、friend_id毎に最新ステータスを割り当てる
    // status優先度: paid > pending > refunded > failed
    // 同一friendに複数レコードがある場合は paid を優先し、なければ最新の作成日時を採用
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("friend_id, status, amount, paid_at, created_at")
      .eq("seminar_id", id)
      .order("created_at", { ascending: false })

    const paymentByFriend = new Map<
      string,
      { status: string; amount: number | null; paid_at: string | null }
    >()
    for (const row of paymentRows || []) {
      const friendId = (row as { friend_id: string | null }).friend_id
      if (!friendId) continue
      const existing = paymentByFriend.get(friendId)
      // 既に paid が入っている場合は上書きしない
      if (existing && existing.status === "paid") continue
      const status = (row as { status: string }).status
      const amount = (row as { amount: number | null }).amount
      const paid_at = (row as { paid_at: string | null }).paid_at
      // paid があれば必ず優先、それ以外は最新（order済み）の1件目のみ採用
      if (status === "paid" || !existing) {
        paymentByFriend.set(friendId, { status, amount, paid_at })
      }
    }

    const attendeesWithPayment = (attendees || []).map((a) => {
      const friendId = (a as { friend_id: string | null }).friend_id
      const payment = friendId ? paymentByFriend.get(friendId) : undefined
      return {
        ...a,
        payment_status: payment?.status ?? null,
        payment_amount: payment?.amount ?? null,
        paid_at: payment?.paid_at ?? null,
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
