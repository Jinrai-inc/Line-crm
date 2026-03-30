import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// 手動で参加登録
export async function POST(request: NextRequest) {
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

    const { friendId, seminarId, status: attendanceStatus } = await request.json()
    if (!friendId || !seminarId) {
      return NextResponse.json({ error: "友だちIDとセミナーIDは必須です" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("attendances")
      .insert({
        organization_id: orgId,
        friend_id: friendId,
        seminar_id: seminarId,
        status: attendanceStatus || "applied",
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "既に登録されています" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Attendance POST error:", error)
    return NextResponse.json({ error: "参加登録に失敗しました" }, { status: 500 })
  }
}
