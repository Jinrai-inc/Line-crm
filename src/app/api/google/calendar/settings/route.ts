import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// Googleカレンダー設定取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data: settings } = await admin
      .from("google_calendar_settings")
      .select("id, organization_id, calendar_id, sync_enabled, created_at, updated_at")
      .eq("organization_id", orgId)
      .single()

    return NextResponse.json({ settings: settings ?? null })
  } catch (error) {
    console.error("Google Calendar settings GET error:", error)
    return NextResponse.json({ settings: null })
  }
}

// Googleカレンダー設定更新
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const { sync_enabled } = body

    const { data, error } = await admin
      .from("google_calendar_settings")
      .update({
        sync_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .select("id, organization_id, calendar_id, sync_enabled, created_at, updated_at")
      .single()

    if (error) throw error

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error("Google Calendar settings PATCH error:", error)
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 })
  }
}

// Googleカレンダー連携解除
export async function DELETE() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { error } = await admin
      .from("google_calendar_settings")
      .delete()
      .eq("organization_id", orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Google Calendar settings DELETE error:", error)
    return NextResponse.json({ error: "連携解除に失敗しました" }, { status: 500 })
  }
}
