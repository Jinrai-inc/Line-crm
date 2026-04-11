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

    return NextResponse.json({
      data: { ...seminar, attendees: attendees || [] },
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

    const fields = ["title", "description", "event_date", "start_time", "end_time", "location", "location_url", "capacity", "status", "registration_deadline", "tag_ids", "payment_url", "zoom_url", "price", "post_payment_url", "zoom_note"]
    const fieldMap: Record<string, string> = {
      title: "title", description: "description", eventDate: "event_date",
      startTime: "start_time", endTime: "end_time", location: "location",
      locationUrl: "location_url", capacity: "capacity", status: "status",
      registrationDeadline: "registration_deadline", tagIds: "tag_ids",
      paymentUrl: "payment_url", zoomUrl: "zoom_url", price: "price",
      postPaymentUrl: "post_payment_url",
      zoomNote: "zoom_note",
    }

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (body[camel] !== undefined) {
        updateData[snake] = body[camel]
      }
    }
    // snake_case の直接指定もサポート
    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
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
      throw error
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Seminar PATCH error:", error)
    return NextResponse.json({ error: "セミナーの更新に失敗しました" }, { status: 500 })
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
