import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createCalendarEvent, listCalendarEvents } from "@/lib/google/calendar"

async function getCalendarSettings(supabase: Parameters<never>[never] extends never ? Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>> : never, orgId: string) {
  const { data: settings } = await supabase
    .from("google_calendar_settings")
    .select("*")
    .eq("organization_id", orgId)
    .eq("sync_enabled", true)
    .single()

  if (!settings) {
    return {
      error: NextResponse.json(
        { error: "Googleカレンダーが連携されていません" },
        { status: 400 }
      ),
    }
  }

  return { settings }
}

// List calendar events
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const result = await getCalendarSettings(supabase, orgId)
    if (result.error) return result.error

    const { settings } = result
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get("timeMin")
    const timeMax = searchParams.get("timeMax")

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: "timeMin と timeMax は必須です" },
        { status: 400 }
      )
    }

    const events = await listCalendarEvents(
      settings!.google_access_token!,
      settings!.google_refresh_token!,
      timeMin,
      timeMax
    )

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Calendar events list error:", error)
    return NextResponse.json(
      { error: "カレンダーイベントの取得に失敗しました" },
      { status: 500 }
    )
  }
}

// Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const result = await getCalendarSettings(supabase, orgId)
    if (result.error) return result.error

    const { settings } = result
    const body = await request.json()

    const { summary, description, startDateTime, endDateTime, attendeeEmails } =
      body

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "summary, startDateTime, endDateTime は必須です" },
        { status: 400 }
      )
    }

    const event = await createCalendarEvent(
      settings!.google_access_token!,
      settings!.google_refresh_token!,
      {
        summary,
        description,
        startDateTime,
        endDateTime,
        attendeeEmails,
      }
    )

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("Calendar event create error:", error)
    return NextResponse.json(
      { error: "カレンダーイベントの作成に失敗しました" },
      { status: 500 }
    )
  }
}
