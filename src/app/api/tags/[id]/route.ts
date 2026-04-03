import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// タグ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { name, color, description } = await request.json()

    const { data, error } = await supabase
      .from("tags")
      .update({ name, color, description })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Tag PATCH error:", error)
    return NextResponse.json({ error: "タグの更新に失敗しました" }, { status: 500 })
  }
}

// タグ削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { error } = await supabase.from("tags").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tag DELETE error:", error)
    return NextResponse.json({ error: "タグの削除に失敗しました" }, { status: 500 })
  }
}
