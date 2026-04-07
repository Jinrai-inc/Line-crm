import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// Helper for untyped table
function surveysTable(admin: ReturnType<typeof createAdminClient>) {
  return admin.from("seminar_surveys" as never)
}

// アンケート取得
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

    const { data, error } = await (surveysTable(admin)
      .select("*")
      .eq("seminar_id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: { code?: string } | null }>)

    if (error && error.code !== "PGRST116") {
      console.error("Survey GET error:", error)
    }

    return NextResponse.json({ data: data ?? null })
  } catch (error) {
    console.error("Survey GET error:", error)
    return NextResponse.json({ data: null })
  }
}

// アンケート作成・更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { title, questions, enabled } = body

    // questions format:
    // [{ label: "性別", choices: [
    //   { text: "男性", tagName: "男性", rewardMessage: "...", rewardUrl: "..." },
    //   { text: "女性", tagName: "女性", rewardMessage: "...", rewardUrl: "..." }
    // ]}]

    const record = {
      seminar_id: id,
      organization_id: orgId,
      title: title || "アンケート",
      questions: JSON.stringify(questions || []),
      enabled: enabled ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (surveysTable(admin)
      .upsert(record as never, { onConflict: "organization_id,seminar_id" as never })
      .select("*")
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

    if (error) {
      console.error("Survey POST error:", error)
      return NextResponse.json({ error: "アンケートの保存に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Survey POST error:", error)
    return NextResponse.json({ error: "アンケートの保存に失敗しました" }, { status: 500 })
  }
}
