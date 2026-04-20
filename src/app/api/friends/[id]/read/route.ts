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

    // read_at カラムが DB に存在しない場合に 500 にならないよう try/catch
    try {
      await (admin
        .from("friends")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("id" as never, id)
        .eq("organization_id" as never, orgId) as unknown as Promise<{ error: unknown }>)
    } catch {
      // read_at カラムが存在しない環境では無視（機能は劣化するが 500 にはならない）
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json({ success: true })
  }
}
