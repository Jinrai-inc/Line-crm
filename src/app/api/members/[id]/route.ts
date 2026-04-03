import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 会員詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { data: member, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!member) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 })

    return NextResponse.json({ data: member })
  } catch (error) {
    console.error("Member GET error:", error)
    return NextResponse.json({ error: "会員詳細の取得に失敗しました" }, { status: 500 })
  }
}

// 会員情報更新
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
    const { name, gender, status, membership_plan, join_date, counselor_id, counselor_memo, withdraw_date, withdraw_reason, pause_start_date, pause_end_date, activity_pace } = body

    const { data, error } = await supabase
      .from("members")
      .update({
        name,
        gender,
        status,
        membership_plan,
        join_date,
        counselor_id,
        counselor_memo,
        withdraw_date,
        withdraw_reason,
        pause_start_date,
        pause_end_date,
        activity_pace,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Member PATCH error:", error)
    return NextResponse.json({ error: "会員の更新に失敗しました" }, { status: 500 })
  }
}

// 会員削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("members").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Member DELETE error:", error)
    return NextResponse.json({ error: "会員の削除に失敗しました" }, { status: 500 })
  }
}
