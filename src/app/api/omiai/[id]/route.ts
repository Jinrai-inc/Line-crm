import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// お見合い詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { data: omiai, error } = await supabase
      .from("omiai")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!omiai) return NextResponse.json({ error: "お見合いが見つかりません" }, { status: 404 })

    return NextResponse.json({ data: omiai })
  } catch (error) {
    console.error("Omiai GET error:", error)
    return NextResponse.json({ error: "お見合い詳細の取得に失敗しました" }, { status: 500 })
  }
}

// お見合い更新
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
    const { male_member_id, female_member_id, scheduled_date, scheduled_time, location, location_url, status, male_result, female_result, match_result, male_feedback, female_feedback, counselor_note } = body

    const { data, error } = await supabase
      .from("omiai")
      .update({
        male_member_id,
        female_member_id,
        scheduled_date,
        scheduled_time,
        location,
        location_url,
        status,
        male_result,
        female_result,
        match_result,
        male_feedback,
        female_feedback,
        counselor_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Omiai PATCH error:", error)
    return NextResponse.json({ error: "お見合いの更新に失敗しました" }, { status: 500 })
  }
}

// お見合い削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("omiai").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Omiai DELETE error:", error)
    return NextResponse.json({ error: "お見合いの削除に失敗しました" }, { status: 500 })
  }
}
