import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 友だちデータCSVエクスポート
// 他のLINE CRM（ProLine等）へ移行できるよう、LINEユーザーIDとタグを含めた
// フル情報を CSV で出力する。検索/ステータス/タグ/選択済みID のフィルタに対応。
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const ids = searchParams.get("ids") || ""
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const tagIds = searchParams.get("tagIds") || ""

    // ベースクエリ: friends + 紐づくタグ名
    let query = supabase
      .from("friends")
      .select(
        `id, line_user_id, display_name, custom_name, picture_url, status,
         email, phone, memo, first_added_at, last_message_at, created_at,
         friend_tags(tags(id, name))`
      )
      .eq("organization_id", orgId)

    // 選択済みID のみエクスポート（最優先）
    if (ids) {
      const idArray = ids.split(",").filter(Boolean)
      if (idArray.length > 0) {
        query = query.in("id", idArray)
      }
    }

    // 検索フィルタ（友だち一覧APIと同じ条件）
    if (!ids && search.trim()) {
      const tokens = search
        .trim()
        .split(/[\s\u3000]+/)
        .map((t) => t.replace(/[\\%_,()*:"']/g, "").trim())
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
    if (!ids && status && status !== "all") {
      query = query.eq("status", status)
    }

    query = query.order("created_at", { ascending: false })

    const { data: friends, error } = await query
    if (error) throw error

    // タグフィルタ（取得後にクライアントサイドで適用。friends APIと挙動を揃える）
    let filteredFriends = friends || []
    if (!ids && tagIds) {
      const tagIdArray = tagIds.split(",").filter(Boolean)
      filteredFriends = filteredFriends.filter((f: Record<string, unknown>) => {
        const friendTagsRaw =
          (f.friend_tags as unknown as Array<{ tags: { id?: string } | { id?: string }[] | null }>) || []
        return tagIdArray.some((tid) =>
          friendTagsRaw.some((ft) => {
            const t = ft.tags
            if (!t) return false
            if (Array.isArray(t)) return t.some((x) => x.id === tid)
            return t.id === tid
          })
        )
      })
    }

    // CSV カラム定義（ProLine等への移行を想定しLINEユーザーIDを先頭に）
    const headers = [
      "LINEユーザーID",
      "LINE表示名",
      "管理用名前",
      "プロフィール画像URL",
      "ステータス",
      "タグ",
      "メール",
      "電話番号",
      "メモ",
      "友だち追加日",
      "最終メッセージ日",
      "CRM登録日",
    ]

    const statusLabelMap: Record<string, string> = {
      active: "アクティブ",
      blocked: "ブロック",
      unfollowed: "フォロー解除",
    }

    const formatDateTime = (iso: string | null | undefined): string => {
      if (!iso) return ""
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ""
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      return `${y}-${m}-${day} ${hh}:${mm}`
    }

    // CSV セル用のエスケープ: ダブルクォート/改行/カンマを含む値を安全に包む
    const escapeCell = (v: unknown): string => {
      if (v === null || v === undefined) return '""'
      const s = String(v)
      // ダブルクォートはエスケープ（2個にする）
      const escaped = s.replace(/"/g, '""')
      return `"${escaped}"`
    }

    // Supabase のレスポンス型は nested select を配列として返すことがあるため、
    // unknown を経由して柔軟に扱う
    const rows = filteredFriends.map((f) => {
      const friendTagsRaw =
        ((f as unknown as { friend_tags?: Array<{ tags: { name?: string } | { name?: string }[] | null }> }).friend_tags) || []
      const tagNames = friendTagsRaw
        .map((ft) => {
          const t = ft.tags
          if (!t) return undefined
          // 片方の形 (object) にも (array) にも対応
          if (Array.isArray(t)) return t[0]?.name
          return t.name
        })
        .filter((n): n is string => Boolean(n))
        .join(",") // タグ内の区切りは , を使用（セル全体は "..." でエスケープ済み）
      return [
        f.line_user_id ?? "",
        f.display_name ?? "",
        f.custom_name ?? "",
        f.picture_url ?? "",
        statusLabelMap[f.status as string] ?? f.status ?? "",
        tagNames,
        f.email ?? "",
        f.phone ?? "",
        f.memo ?? "",
        formatDateTime(f.first_added_at as string | null),
        formatDateTime(f.last_message_at as string | null),
        formatDateTime(f.created_at as string | null),
      ]
    })

    // BOM 付き UTF-8 (Excel で文字化けしないように)
    const bom = "\uFEFF"
    const csv =
      bom +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCell(cell)).join(","))
        .join("\r\n")

    const dateStr = new Date().toISOString().split("T")[0]
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="friends_${dateStr}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "エクスポートに失敗しました" },
      { status: 500 }
    )
  }
}
