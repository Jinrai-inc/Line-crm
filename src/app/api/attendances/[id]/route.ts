import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// 参加ステータス変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { status: newStatus, memo, cancelReason } = await request.json()

    const updateData: Record<string, unknown> = {}
    if (newStatus) updateData.status = newStatus
    if (memo !== undefined) updateData.memo = memo

    // ステータス別のタイムスタンプ更新
    switch (newStatus) {
      case "confirmed":
        updateData.confirmed_at = new Date().toISOString()
        break
      case "attended":
        updateData.attended_at = new Date().toISOString()
        break
      case "cancelled":
        updateData.cancelled_at = new Date().toISOString()
        if (cancelReason) updateData.cancel_reason = cancelReason
        break
    }

    const { data, error } = await supabase
      .from("attendances")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Attendance PATCH error:", error)
    return NextResponse.json({ error: "ステータスの変更に失敗しました" }, { status: 500 })
  }
}

// 参加取消
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { error } = await supabase.from("attendances").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Attendance DELETE error:", error)
    return NextResponse.json({ error: "参加取消に失敗しました" }, { status: 500 })
  }
}
