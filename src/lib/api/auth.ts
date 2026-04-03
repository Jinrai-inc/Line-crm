import { NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthResult =
  | { ok: false; response: NextResponse }
  | { ok: true; supabase: SupabaseClient; orgId: string; userId: string }

/**
 * 認証済みユーザーの organization_id を取得する。
 * RLS の影響を受けないように admin クライアントで users テーブルを参照する。
 */
export async function getAuthenticatedOrgId(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "未認証" }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!userData || userError) {
    return { ok: false, response: NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 }) }
  }

  return { ok: true, supabase, orgId: userData.organization_id!, userId: user.id }
}
