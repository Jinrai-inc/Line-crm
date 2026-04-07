import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// アンケート回答結果の取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    // survey_responses テーブルから回答を取得
    const { data: responses, error } = await (admin
      .from("survey_responses" as never)
      .select("*")
      .eq("survey_id" as never, id)
      .eq("organization_id" as never, orgId)
      .order("created_at" as never, { ascending: true }) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null
        error: unknown
      }>)

    if (error) {
      const errMsg = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message : ""
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return NextResponse.json({ data: [] })
      }
      throw error
    }

    // 友だち情報を結合
    const friendIds = [...new Set(
      (responses || [])
        .map((r) => r.friend_id as string)
        .filter(Boolean)
    )]

    let friendMap: Record<string, { display_name: string; picture_url: string | null }> = {}
    if (friendIds.length > 0) {
      const { data: friends } = await admin
        .from("friends")
        .select("id, display_name, picture_url")
        .in("id", friendIds)

      for (const f of (friends || []) as Array<{ id: string; display_name: string; picture_url: string | null }>) {
        friendMap[f.id] = { display_name: f.display_name, picture_url: f.picture_url }
      }
    }

    const enriched = (responses || []).map((r) => ({
      ...r,
      friend: r.friend_id ? friendMap[r.friend_id as string] || null : null,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error("Survey responses GET error:", error)
    return NextResponse.json({ error: "回答結果の取得に失敗しました" }, { status: 500 })
  }
}
