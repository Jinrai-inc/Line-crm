import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// seminar_followups テーブルはDB型定義に未追加のため any でキャスト
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function followupsTable(admin: ReturnType<typeof createAdminClient>) {
  return admin.from("seminar_followups" as never) as unknown as ReturnType<
    ReturnType<typeof createAdminClient>["from"]
  >
}

// フォローアップ設定取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    // セミナーが組織に属しているか確認
    const { data: seminar, error: seminarError } = await admin
      .from("seminars")
      .select("id")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (seminarError || !seminar) {
      return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })
    }

    const { data: followup, error } = await (followupsTable(admin)
      .select("*")
      .eq("seminar_id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: { code: string } | null }>)

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json({ data: followup ?? null })
  } catch (error) {
    console.error("Seminar followup GET error:", error)
    return NextResponse.json({ error: "フォローアップ設定の取得に失敗しました" }, { status: 500 })
  }
}

// フォローアップ設定の作成・更新（upsert）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    // セミナーが組織に属しているか確認
    const { data: seminar, error: seminarError } = await admin
      .from("seminars")
      .select("id")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (seminarError || !seminar) {
      return NextResponse.json({ error: "セミナーが見つかりません" }, { status: 404 })
    }

    const body = await request.json()
    const { thankYouMessage, buttons, enabled } = body

    const upsertData = {
      seminar_id: id,
      organization_id: orgId,
      thank_you_message: thankYouMessage,
      buttons: buttons ?? [],
      enabled: enabled ?? false,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (admin
      .from("seminar_followups" as never)
      .upsert(upsertData as never, { onConflict: "organization_id,seminar_id" } as never)
      .select("*" as never)
      .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Seminar followup POST error:", error)
    return NextResponse.json({ error: "フォローアップ設定の保存に失敗しました" }, { status: 500 })
  }
}
