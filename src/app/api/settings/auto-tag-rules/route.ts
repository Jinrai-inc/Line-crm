import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// auto_tag_rules テーブル:
// id UUID PK, organization_id UUID, tag_id UUID, tag_name TEXT,
// duration_minutes INT, enabled BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

// ルール一覧取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { data, error } = await (admin
      .from("auto_tag_rules" as never)
      .select("*")
      .eq("organization_id" as never, orgId)
      .order("created_at" as never, { ascending: false }) as unknown as Promise<{
        data: Array<{
          id: string
          tag_id: string | null
          tag_name: string
          duration_minutes: number
          enabled: boolean
          created_at: string
        }> | null
        error: unknown
      }>)

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Auto-tag rules GET error:", error)
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 })
  }
}

// ルール作成・更新
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { tagName, durationMinutes, enabled } = await request.json()

    if (!tagName || !durationMinutes) {
      return NextResponse.json({ error: "タグ名と時間は必須です" }, { status: 400 })
    }

    // タグを自動作成（存在しなければ）
    let { data: tag } = await admin
      .from("tags")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", tagName)
      .single()

    if (!tag) {
      const { data: newTag } = await admin
        .from("tags")
        .insert({ organization_id: orgId, name: tagName })
        .select("id")
        .single()
      tag = newTag
    }

    const { data, error } = await (admin
      .from("auto_tag_rules" as never)
      .insert({
        organization_id: orgId,
        tag_id: tag?.id || null,
        tag_name: tagName,
        duration_minutes: durationMinutes,
        enabled: enabled ?? true,
      } as never)
      .select("*")
      .single() as unknown as Promise<{ data: unknown; error: unknown }>)

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Auto-tag rules POST error:", error)
    return NextResponse.json({ error: "ルールの作成に失敗しました" }, { status: 500 })
  }
}

// ルール削除
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 })
    }

    const { error } = await (admin
      .from("auto_tag_rules" as never)
      .delete()
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId) as unknown as Promise<{ error: unknown }>)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Auto-tag rules DELETE error:", error)
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 })
  }
}

// ルール有効/無効切替
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const { id, enabled } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 })
    }

    const { error } = await (admin
      .from("auto_tag_rules" as never)
      .update({ enabled, updated_at: new Date().toISOString() } as never)
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId) as unknown as Promise<{ error: unknown }>)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Auto-tag rules PATCH error:", error)
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
  }
}
