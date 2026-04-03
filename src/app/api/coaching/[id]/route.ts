import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// コーチング予約更新
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

    if (body.member_id !== undefined) updateData.member_id = body.member_id
    if (body.booking_date !== undefined) updateData.booking_date = body.booking_date
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.status !== undefined) updateData.status = body.status
    if (body.booking_type !== undefined) updateData.booking_type = body.booking_type
    if (body.member_message !== undefined) updateData.member_message = body.member_message
    if (body.google_event_id !== undefined) updateData.google_event_id = body.google_event_id

    const { data, error } = await supabase
      .from("coaching_bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Coaching PATCH error:", error)
    return NextResponse.json({ error: "コーチング予約の更新に失敗しました" }, { status: 500 })
  }
}

// コーチング予約削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("coaching_bookings").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Coaching DELETE error:", error)
    return NextResponse.json({ error: "コーチング予約の削除に失敗しました" }, { status: 500 })
  }
}
