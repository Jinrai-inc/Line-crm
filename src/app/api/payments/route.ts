import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// 支払い一覧取得
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
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("payments")
      .select("*, friends(id, display_name, custom_name)", { count: "exact" })
      .eq("organization_id", orgId)

    // 検索フィルタ
    if (search) {
      query = query.ilike("item_name", `%${search}%`)
    }

    // ステータスフィルタ
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // ソート（新しい順）
    query = query.order("created_at", { ascending: false })

    // ページネーション
    query = query.range(from, to)

    const { data: payments, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: payments || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Payments GET error:", error)
    return NextResponse.json({ error: "支払い一覧の取得に失敗しました" }, { status: 500 })
  }
}
