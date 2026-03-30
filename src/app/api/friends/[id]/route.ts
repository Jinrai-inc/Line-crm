import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// 友だち詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: friend, error } = await supabase
      .from("friends")
      .select(`
        *,
        friend_tags(tag_id, tags(id, name, color)),
        attendances(id, status, applied_at, seminars(id, title, event_date)),
        message_logs(id, event_type, message_type, content, created_at)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    if (!friend) return NextResponse.json({ error: "友だちが見つかりません" }, { status: 404 })

    return NextResponse.json({ data: friend })
  } catch (error) {
    console.error("Friend GET error:", error)
    return NextResponse.json({ error: "友だち詳細の取得に失敗しました" }, { status: 500 })
  }
}

// 友だち情報更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const body = await request.json()
    const { customName, email, phone, memo } = body

    const { data, error } = await supabase
      .from("friends")
      .update({
        custom_name: customName,
        email,
        phone,
        memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Friend PATCH error:", error)
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
  }
}

// 友だち削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { error } = await supabase.from("friends").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Friend DELETE error:", error)
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 })
  }
}
