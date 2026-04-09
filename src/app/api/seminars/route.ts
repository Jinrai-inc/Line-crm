import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// セミナー一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || ""

    let query = supabase
      .from("seminars")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("event_date", { ascending: true })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: seminars, count, error } = await query
    if (error) throw error

    // 各セミナーの申込数を取得
    const seminarsWithCount = await Promise.all(
      (seminars || []).map(async (s) => {
        const { count: attendeeCount } = await supabase
          .from("attendances")
          .select("*", { count: "exact", head: true })
          .eq("seminar_id", s.id)
          .neq("status", "cancelled")
        return { ...s, attendee_count: attendeeCount || 0 }
      })
    )

    return NextResponse.json({ data: seminarsWithCount, total: count || 0 })
  } catch (error) {
    console.error("Seminars GET error:", error)
    return NextResponse.json({ error: "セミナー一覧の取得に失敗しました" }, { status: 500 })
  }
}

// セミナー新規作成
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { title, description, eventDate, startTime, endTime, location, locationUrl, capacity, status: seminarStatus, registrationDeadline, tag_ids, paymentUrl } = body

    if (!title || !eventDate) {
      return NextResponse.json({ error: "セミナー名と開催日は必須です" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("seminars")
      .insert({
        organization_id: orgId,
        title,
        description,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location,
        location_url: locationUrl,
        capacity: capacity || 0,
        status: seminarStatus || "draft",
        registration_deadline: registrationDeadline || null,
        tag_ids: tag_ids || [],
        payment_url: paymentUrl || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Seminar POST error:", error)
    return NextResponse.json({ error: "セミナーの作成に失敗しました" }, { status: 500 })
  }
}
