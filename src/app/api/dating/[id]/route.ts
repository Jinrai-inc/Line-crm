import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 交際更新
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
    const { omiai_id, male_member_id, female_member_id, status, started_at, serious_at, engaged_at, broken_up_at, break_reason, date_count, counselor_note } = body

    const { data, error } = await supabase
      .from("dating")
      .update({
        omiai_id,
        male_member_id,
        female_member_id,
        status,
        started_at,
        serious_at,
        engaged_at,
        broken_up_at,
        break_reason,
        date_count,
        counselor_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Dating PATCH error:", error)
    return NextResponse.json({ error: "交際の更新に失敗しました" }, { status: 500 })
  }
}

// 交際削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("dating").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Dating DELETE error:", error)
    return NextResponse.json({ error: "交際の削除に失敗しました" }, { status: 500 })
  }
}
