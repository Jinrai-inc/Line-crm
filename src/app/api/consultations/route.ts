import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 面談・相談一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const memberId = searchParams.get("member_id") || ""
    const consultationType = searchParams.get("consultation_type") || ""
    const sortBy = searchParams.get("sortBy") || "consultation_date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("consultations")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)

    // 会員フィルタ
    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    // 相談種別フィルタ
    if (consultationType && consultationType !== "all") {
      query = query.eq("consultation_type", consultationType)
    }

    // ソート
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // ページネーション
    query = query.range(from, to)

    const { data: consultations, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: consultations || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Consultations GET error:", error)
    return NextResponse.json({ error: "面談・相談一覧の取得に失敗しました" }, { status: 500 })
  }
}

// 面談・相談作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { member_id, consultation_date, consultation_type, summary, action_items, next_consultation_date } = body

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        organization_id: orgId,
        member_id,
        consultation_date,
        consultation_type,
        summary: summary || "",
        action_items,
        next_consultation_date,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Consultations POST error:", error)
    return NextResponse.json({ error: "面談・相談の作成に失敗しました" }, { status: 500 })
  }
}
