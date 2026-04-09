import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// ステップ配信設定の取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data } = await (admin
      .from("step_message_settings" as never)
      .select("*")
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{
        data: { enabled: boolean; steps: unknown } | null
        error: unknown
      }>)

    return NextResponse.json({
      enabled: data?.enabled ?? false,
      steps: data?.steps ?? [],
    })
  } catch (error) {
    console.error("Step messages GET error:", error)
    return NextResponse.json({ enabled: false, steps: [] })
  }
}

// ステップ配信設定の保存
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { enabled, steps } = body

    const settingsData = {
      enabled: enabled ?? false,
      steps: steps || [],
      updated_at: new Date().toISOString(),
    }

    // 既存設定の確認
    const { data: existing } = await (admin
      .from("step_message_settings" as never)
      .select("id")
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>)

    if (existing) {
      await (admin
        .from("step_message_settings" as never)
        .update(settingsData as never)
        .eq("id" as never, existing.id) as unknown as Promise<{ error: unknown }>)
    } else {
      await (admin
        .from("step_message_settings" as never)
        .insert({
          organization_id: orgId,
          ...settingsData,
        } as never) as unknown as Promise<{ error: unknown }>)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Step messages POST error:", error)
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 })
  }
}
