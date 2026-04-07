import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// 友だちを既読にする
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { error } = await (admin
      .from("friends")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId) as unknown as Promise<{ error: unknown }>)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json({ error: "既読の更新に失敗しました" }, { status: 500 })
  }
}
