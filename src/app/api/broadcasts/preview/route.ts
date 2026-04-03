import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 配信プレビュー（対象者数の確認）
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { targetType, targetFilter } = await request.json()

    let count = 0

    if (targetType === "all") {
      const { count: totalCount } = await supabase
        .from("friends")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active")
      count = totalCount || 0
    } else if (targetType === "tag" && targetFilter?.tagIds) {
      const { data: taggedFriends } = await supabase
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", targetFilter.tagIds)

      if (taggedFriends) {
        const uniqueFriendIds = [...new Set(taggedFriends.map((ft: { friend_id: string | null }) => ft.friend_id).filter((id): id is string => id !== null))]
        count = uniqueFriendIds.length
      }
    } else if (targetType === "seminar" && targetFilter?.seminarId) {
      const { count: attendeeCount } = await supabase
        .from("attendances")
        .select("friend_id", { count: "exact", head: true })
        .eq("seminar_id", targetFilter.seminarId)
        .neq("status", "cancelled")
      count = attendeeCount || 0
    }

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Preview error:", error)
    return NextResponse.json({ error: "プレビューの取得に失敗しました" }, { status: 500 })
  }
}
