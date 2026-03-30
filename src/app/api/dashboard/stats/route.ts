import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// ダッシュボード統計サマリー
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })

    const orgId = userData.organization_id!

    // 並行でデータ取得
    const [
      activeFriends,
      openSeminars,
      newFriendsThisMonth,
      totalAttendances,
      activeMembers,
      completedOmiai,
      mutualOmiai,
      marriages,
    ] = await Promise.all([
      supabase.from("friends").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
      supabase.from("seminars").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "open"),
      supabase.from("friends").select("*", { count: "exact", head: true }).eq("organization_id", orgId).gte("first_added_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from("attendances").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
      supabase.from("omiai").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "completed"),
      supabase.from("omiai").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("match_result", "mutual"),
      supabase.from("marriages").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    ])

    const completedCount = completedOmiai.count || 0
    const mutualCount = mutualOmiai.count || 0

    return NextResponse.json({
      seminar: {
        activeFriends: activeFriends.count || 0,
        openSeminars: openSeminars.count || 0,
        newFriendsThisMonth: newFriendsThisMonth.count || 0,
        totalAttendances: totalAttendances.count || 0,
      },
      marriage: {
        activeMembers: activeMembers.count || 0,
        omiaiMatchRate: completedCount > 0 ? Math.round((mutualCount / completedCount) * 100) : 0,
        marriageCount: marriages.count || 0,
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "統計の取得に失敗しました" }, { status: 500 })
  }
}
