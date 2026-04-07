import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// 挨拶メッセージ設定の取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data: settings } = await (admin
      .from("greeting_settings" as never)
      .select("*")
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>)

    return NextResponse.json({ settings: settings || null })
  } catch (error) {
    console.error("Greeting settings GET error:", error)
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 })
  }
}

// 挨拶メッセージ設定の保存
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const {
      enabled,
      message,
      scheduleEnabled,
      scheduleStart,
      scheduleEnd,
      scheduleMessage,
    } = body

    const settingsData: Record<string, unknown> = {
      enabled: enabled ?? true,
      message: message || null,
      schedule_enabled: scheduleEnabled ?? false,
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      schedule_message: scheduleMessage || null,
      updated_at: new Date().toISOString(),
    }

    // 既存設定の確認
    const { data: existing } = await (admin
      .from("greeting_settings" as never)
      .select("id")
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>)

    if (existing) {
      const { error } = await (admin
        .from("greeting_settings" as never)
        .update(settingsData as never)
        .eq("id" as never, existing.id) as unknown as Promise<{ error: unknown }>)
      if (error) throw error
    } else {
      const { error } = await (admin
        .from("greeting_settings" as never)
        .insert({
          organization_id: orgId,
          ...settingsData,
        } as never) as unknown as Promise<{ error: unknown }>)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Greeting settings POST error:", error)
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 })
  }
}
