import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// surveys テーブル (untyped):
// id UUID PK, organization_id UUID, title TEXT, questions JSONB,
// status TEXT ("draft"|"published"), enabled BOOLEAN,
// created_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

function surveysTable(admin: ReturnType<typeof createAdminClient>) {
  return admin.from("surveys" as never)
}

// アンケート一覧取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data, error } = await (surveysTable(admin)
      .select("*")
      .eq("organization_id" as never, orgId)
      .order("created_at" as never, { ascending: false }) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null
        error: unknown
      }>)

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Surveys GET error:", error)
    return NextResponse.json({ error: "アンケートの取得に失敗しました" }, { status: 500 })
  }
}

// アンケート作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId, userId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { title, questions, status } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 })
    }

    const { data, error } = await (surveysTable(admin)
      .insert({
        organization_id: orgId,
        title: title.trim(),
        questions: JSON.stringify(questions || []),
        status: status || "draft",
        enabled: true,
        created_by: userId,
      } as never)
      .select("*")
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Surveys POST error:", error)
    return NextResponse.json({ error: "アンケートの作成に失敗しました" }, { status: 500 })
  }
}
