import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function parseTemplate(row: { content: string; [key: string]: unknown }) {
  let contentData: Record<string, unknown> = {}
  try {
    contentData = JSON.parse(row.content as string)
  } catch {
    contentData = { text: row.content }
  }
  return {
    ...row,
    template_type: (contentData.template_type as string) || "text",
    content_json: contentData.content_json || {},
    variables: contentData.variables || [],
    is_active: contentData.is_active !== false,
    used_count: (contentData.used_count as number) || 0,
  }
}

// テンプレート取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data: parseTemplate(data) })
  } catch (error) {
    console.error("MessageTemplate GET error:", error)
    return NextResponse.json({ error: "テンプレートの取得に失敗しました" }, { status: 500 })
  }
}

// テンプレート更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

    // Fetch existing to merge content fields
    const { data: existing, error: fetchError } = await supabase
      .from("message_templates")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 })
      }
      throw fetchError
    }

    let existingContent: Record<string, unknown> = {}
    try {
      existingContent = JSON.parse(existing.content)
    } catch {
      existingContent = { text: existing.content }
    }

    const body = await request.json()
    const updateFields: Record<string, unknown> = {}

    if (body.name !== undefined) updateFields.name = body.name
    if (body.category !== undefined) updateFields.category = body.category

    // Merge content fields
    const newContent = { ...existingContent }
    if (body.template_type !== undefined) newContent.template_type = body.template_type
    if (body.content_json !== undefined) newContent.content_json = body.content_json
    if (body.variables !== undefined) newContent.variables = body.variables
    if (body.is_active !== undefined) newContent.is_active = body.is_active
    if (body.used_count !== undefined) newContent.used_count = body.used_count

    updateFields.content = JSON.stringify(newContent)

    const { data, error } = await supabase
      .from("message_templates")
      .update(updateFields)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "同じ名前のテンプレートが既に存在します" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data: parseTemplate(data) })
  } catch (error) {
    console.error("MessageTemplate PATCH error:", error)
    return NextResponse.json({ error: "テンプレートの更新に失敗しました" }, { status: 500 })
  }
}

// テンプレート削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MessageTemplate DELETE error:", error)
    return NextResponse.json({ error: "テンプレートの削除に失敗しました" }, { status: 500 })
  }
}
