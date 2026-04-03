import { NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthResult =
  | { ok: false; response: NextResponse }
  | { ok: true; supabase: SupabaseClient; orgId: string; userId: string }

/**
 * 認証済みユーザーの organization_id を取得する。
 * RLS の影響を受けないように admin クライアントで users テーブルを参照する。
 * users レコードが存在しない場合は自動作成する。
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

  if (userData?.organization_id) {
    return { ok: true, supabase, orgId: userData.organization_id, userId: user.id }
  }

  // users レコードが存在しない場合、自動作成
  if (userError?.code === "PGRST116" || !userData) {
    try {
      // 組織を作成
      const orgName = user.user_metadata?.organization_name || user.email?.split("@")[0] || "組織"
      const { data: org, error: orgError } = await admin
        .from("organizations")
        .insert({ name: orgName })
        .select("id")
        .single()

      if (orgError || !org) {
        console.error("Auto-create organization failed:", orgError)
        return { ok: false, response: NextResponse.json({ error: "組織の自動作成に失敗しました" }, { status: 500 }) }
      }

      // ユーザーレコードを作成
      const { error: insertError } = await admin
        .from("users")
        .insert({
          id: user.id,
          email: user.email!,
          organization_id: org.id,
          display_name: user.user_metadata?.display_name || null,
          role: "owner",
        })

      if (insertError) {
        console.error("Auto-create user failed:", insertError)
        return { ok: false, response: NextResponse.json({ error: "ユーザーの自動作成に失敗しました" }, { status: 500 }) }
      }

      return { ok: true, supabase, orgId: org.id, userId: user.id }
    } catch (err) {
      console.error("Auto-provisioning error:", err)
      return { ok: false, response: NextResponse.json({ error: "ユーザー情報の自動作成に失敗しました" }, { status: 500 }) }
    }
  }

  return { ok: false, response: NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 }) }
}
