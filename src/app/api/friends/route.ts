import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 友だち一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)

    // 数値パラメータの安全なパース（NaN / 負値を防ぐ）
    const pageRaw = parseInt(searchParams.get("page") || "1", 10)
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10)
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 500
      ? pageSizeRaw
      : 20

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const tagIds = searchParams.get("tagIds") || ""
    // ids: カンマ区切り UUID のホワイトリスト。「未対応」タブなどで
    // 事前に計算した friend_id のサブセットだけを取得するのに使う。
    const idsParam = searchParams.get("ids") || ""

    // ソートキーのホワイトリスト検証
    // 任意のカラム名を受け入れると Supabase が存在しない列でエラーを返すため、
    // 確実にエラーが起きないよう許可済みのカラムのみ受け付ける。
    const ALLOWED_SORT_FIELDS = new Set([
      "first_added_at",
      "last_message_at",
      "created_at",
      "updated_at",
      "display_name",
    ])
    const sortByInput = searchParams.get("sortBy") || "first_added_at"
    const sortBy = ALLOWED_SORT_FIELDS.has(sortByInput) ? sortByInput : "first_added_at"
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("friends")
      .select("*, friend_tags(tag_id, tags(id, name, color))", { count: "exact" })
      .eq("organization_id", orgId)

    // 検索フィルタ
    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,custom_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,memo.ilike.%${search}%`
      )
    }

    // ステータスフィルタ
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // ids フィルタ（「未対応」タブなどで事前計算済みの UUID 集合だけ返す）
    // カンマ区切りの UUID を配列化して .in() で絞り込む。
    // 空の場合は「該当なし」を返すために存在しない UUID で絞り込む。
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[0-9a-fA-F-]{36}$/.test(s))
      if (ids.length === 0) {
        query = query.eq("id", "00000000-0000-0000-0000-000000000000")
      } else {
        query = query.in("id", ids)
      }
    }

    // ソート
    // last_message_at 等で null があっても末尾に回すことで、
    // 「新しい順」「古い順」のどちらでも未交流のユーザーが先頭に来ないようにする。
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending, nullsFirst: false })

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
