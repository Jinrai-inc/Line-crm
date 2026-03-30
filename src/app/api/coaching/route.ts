import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// コーチング予約一覧取得
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status") || ""
    const memberId = searchParams.get("member_id") || ""
    const sortBy = searchParams.get("sortBy") || "booking_date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("coaching_bookings")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)

    // ステータスフィルタ
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // 会員フィルタ
    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    // ソート
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // ページネーション
    query = query.range(from, to)

    const { data: bookings, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: bookings || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Coaching GET error:", error)
    return NextResponse.json({ error: "コーチング予約一覧の取得に失敗しました" }, { status: 500 })
  }
}

// コーチング予約作成
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

    const body = await request.json()
    const { member_id, booking_date, start_time, end_time, booking_type, member_message } = body

    const { data, error } = await supabase
      .from("coaching_bookings")
      .insert({
        organization_id: orgId,
        member_id,
        booking_date,
        start_time,
        end_time,
        status: "booked",
        booking_type,
        member_message,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Coaching POST error:", error)
    return NextResponse.json({ error: "コーチング予約の作成に失敗しました" }, { status: 500 })
  }
}
