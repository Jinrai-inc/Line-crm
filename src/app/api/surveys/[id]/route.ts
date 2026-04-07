import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

function surveysTable(admin: ReturnType<typeof createAdminClient>) {
  return admin.from("surveys" as never)
}

// アンケート詳細取得
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
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Survey GET error:", error)
    return NextResponse.json({ error: "アンケートの取得に失敗しました" }, { status: 500 })
  }
}

// アンケート更新
export async function PATCH(
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
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.questions !== undefined) updateData.questions = JSON.stringify(body.questions)
    if (body.status !== undefined) updateData.status = body.status
    if (body.enabled !== undefined) updateData.enabled = body.enabled

    const { data, error } = await (surveysTable(admin)
      .update(updateData as never)
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId)
      .select("*")
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Survey PATCH error:", error)
    return NextResponse.json({ error: "アンケートの更新に失敗しました" }, { status: 500 })
  }
}

// アンケート削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { error } = await (surveysTable(admin)
      .delete()
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId) as unknown as Promise<{ error: unknown }>)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Survey DELETE error:", error)
    return NextResponse.json({ error: "アンケートの削除に失敗しました" }, { status: 500 })
  }
}
