import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 会員一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("members")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)

    // 検索フィルタ
    if (search) {
      query = query.or(
        `name.ilike.%${search}%`
      )
    }

    // ステータスフィルタ
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // ソート
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // ページネーション
    query = query.range(from, to)

    const { data: members, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: members || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Members GET error:", error)
    return NextResponse.json({ error: "会員一覧の取得に失敗しました" }, { status: 500 })
  }
}

// 会員作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { friend_id, name, gender, status, membership_plan, join_date, counselor_id, counselor_memo } = body

    const { data, error } = await supabase
      .from("members")
      .insert({
        organization_id: orgId,
        friend_id,
        name,
        gender,
        status: status || "active",
        membership_plan,
        join_date,
        counselor_id,
        counselor_memo,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Members POST error:", error)
    return NextResponse.json({ error: "会員の作成に失敗しました" }, { status: 500 })
  }
}
