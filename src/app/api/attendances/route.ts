import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 手動で参加登録
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

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
