import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 友だちデータCSVエクスポート
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: friends, error } = await supabase
      .from("friends")
      .select("display_name, custom_name, email, phone, status, memo, first_added_at, last_message_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    if (error) throw error

    // CSV生成
    const headers = ["表示名", "管理用名前", "メール", "電話番号", "ステータス", "メモ", "友だち追加日", "最終メッセージ"]
    const rows = (friends || []).map((f) => [
      f.display_name || "",
      f.custom_name || "",
      f.email || "",
      f.phone || "",
      f.status || "",
      f.memo || "",
      f.first_added_at || "",
      f.last_message_at || "",
    ])

    const bom = "\uFEFF"
    const csv = bom + [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="friends_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "エクスポートに失敗しました" }, { status: 500 })
  }
}
