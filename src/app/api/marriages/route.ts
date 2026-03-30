import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// 成婚一覧取得
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
    const sortBy = searchParams.get("sortBy") || "married_date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("marriages")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)

    // ソート
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // ページネーション
    query = query.range(from, to)

    const { data: marriages, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: marriages || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Marriages GET error:", error)
    return NextResponse.json({ error: "成婚一覧の取得に失敗しました" }, { status: 500 })
  }
}

// 成婚作成
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
    const { dating_id, male_member_id, female_member_id, married_date, wedding_date, story, permission_to_publish, days_to_marriage, omiai_count } = body

    const { data, error } = await supabase
      .from("marriages")
      .insert({
        organization_id: orgId,
        dating_id,
        male_member_id,
        female_member_id,
        married_date,
        wedding_date,
        story,
        permission_to_publish,
        days_to_marriage,
        omiai_count,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Marriages POST error:", error)
    return NextResponse.json({ error: "成婚の作成に失敗しました" }, { status: 500 })
  }
}
