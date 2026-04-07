import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// お見合い一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const status = searchParams.get("status") || ""
    const sortBy = searchParams.get("sortBy") || "scheduled_date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("omiai")
      .select("*, male_member:male_member_id(id, name, membership_number, friend:friend_id(display_name, custom_name)), female_member:female_member_id(id, name, membership_number, friend:friend_id(display_name, custom_name))", { count: "exact" })
      .eq("organization_id", orgId)

    // ステータスフィルタ
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // ソート
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // ページネーション
    query = query.range(from, to)

    const { data: omiai, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: omiai || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Omiai GET error:", error)
    return NextResponse.json({ error: "お見合い一覧の取得に失敗しました" }, { status: 500 })
  }
}

// お見合い作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { male_member_id, female_member_id, scheduled_date, scheduled_time, location, location_url, status, counselor_note } = body

    const { data, error } = await supabase
      .from("omiai")
      .insert({
        organization_id: orgId,
        male_member_id,
        female_member_id,
        scheduled_date,
        scheduled_time,
        location,
        location_url,
        status: status || "scheduled",
        counselor_note,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Omiai POST error:", error)
    return NextResponse.json({ error: "お見合いの作成に失敗しました" }, { status: 500 })
  }
}
