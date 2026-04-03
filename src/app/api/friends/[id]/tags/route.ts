import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// タグ付与
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: friendId } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, userId } = auth

    const { tagId } = await request.json()
    if (!tagId) return NextResponse.json({ error: "タグIDが必要です" }, { status: 400 })

    const { error } = await supabase.from("friend_tags").upsert(
      {
        friend_id: friendId,
        tag_id: tagId,
        assigned_by: userId,
        auto_assigned: false,
      },
      { onConflict: "friend_id,tag_id" }
    )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tag assign error:", error)
    return NextResponse.json({ error: "タグの付与に失敗しました" }, { status: 500 })
  }
}

// タグ解除
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase } = auth

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get("tagId")
    const friendId = request.url.split("/friends/")[1]?.split("/tags")[0]

    if (!tagId || !friendId) {
      return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 })
    }

    const { error } = await supabase
      .from("friend_tags")
      .delete()
      .eq("friend_id", friendId)
      .eq("tag_id", tagId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tag remove error:", error)
    return NextResponse.json({ error: "タグの解除に失敗しました" }, { status: 500 })
  }
}
