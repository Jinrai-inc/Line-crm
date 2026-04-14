import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 友だち一覧取得
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
    const tagIds = searchParams.get("tagIds") || ""
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("friends")
      .select("*, friend_tags(tag_id, tags(id, name, color))", { count: "exact" })
      .eq("organization_id", orgId)

    // 検索フィルタ
    // - 半角/全角スペースでトークン分割して複数語検索に対応
    //   （例: 「田中 太郎」→ display_name に「田中」と「太郎」の両方が含まれる友だち）
    // - PostgREST の or() クエリを破壊しうる特殊文字 (, ( ) % _ \ :) は除去
    // - 各トークンにつき複数カラムの OR、トークン間は AND
    if (search && search.trim()) {
      const tokens = search
        .trim()
        .split(/[\s\u3000]+/)
        .map((t) =>
          t.replace(/[\\%_,()*:"']/g, "").trim()
        )
        .filter((t) => t.length > 0)

      const searchableColumns = [
        "display_name",
        "custom_name",
        "email",
        "phone",
        "memo",
      ]

      for (const token of tokens) {
        const orClause = searchableColumns
          .map((col) => `${col}.ilike.%${token}%`)
          .join(",")
        query = query.or(orClause)
      }
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

    const { data: friends, count, error } = await query

    if (error) throw error

    // タグフィルタ（SQLでは複雑なので、取得後にフィルタ）
    let filteredFriends = friends || []
    if (tagIds) {
      const tagIdArray = tagIds.split(",")
      filteredFriends = filteredFriends.filter((f: Record<string, unknown>) => {
        const friendTags = (f.friend_tags as Array<{ tag_id: string }>) || []
        return tagIdArray.some((tid: string) => friendTags.some((ft) => ft.tag_id === tid))
      })
    }

    return NextResponse.json({
      data: filteredFriends,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error("Friends GET error:", error)
    return NextResponse.json({ error: "友だち一覧の取得に失敗しました" }, { status: 500 })
  }
}
