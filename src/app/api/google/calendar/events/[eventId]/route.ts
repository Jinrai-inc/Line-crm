import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { deleteCalendarEvent } from "@/lib/google/calendar"

// Delete a calendar event
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId, userId } = auth
    const admin = createAdminClient()

    const { data: settings } = await admin
      .from("google_calendar_settings")
      .select("*")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("sync_enabled", true)
      .single()

    if (!settings) {
      return NextResponse.json(
        { error: "Googleカレンダーが連携されていません" },
        { status: 400 }
      )
    }

    await deleteCalendarEvent(
      settings.google_access_token!,
      settings.google_refresh_token!,
      eventId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Calendar event delete error:", error)
    return NextResponse.json(
      { error: "カレンダーイベントの削除に失敗しました" },
      { status: 500 }
    )
  }
}
