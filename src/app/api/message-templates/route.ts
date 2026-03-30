import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const templateType = searchParams.get("type")

    let query = supabase
      .from("message_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    const { data: templates, error } = await query

    if (error) throw error

    // Parse content JSON and apply client-side type filter
    let parsed = (templates || []).map((t) => {
      let contentData: Record<string, unknown> = {}
      try {
        contentData = JSON.parse(t.content)
      } catch {
        contentData = { text: t.content }
      }
      return {
        ...t,
        template_type: (contentData.template_type as string) || "text",
        content_json: contentData.content_json || {},
        variables: contentData.variables || [],
        is_active: contentData.is_active !== false,
        used_count: (contentData.used_count as number) || 0,
      }
    })

    if (templateType) {
      parsed = parsed.filter((t) => t.template_type === templateType)
    }

    return NextResponse.json({ data: parsed })
  } catch (error) {
    console.error("MessageTemplates GET error:", error)
    return NextResponse.json({ error: "テンプレート一覧の取得に失敗しました" }, { status: 500 })
  }
}

// テンプレート新規作成
export async function POST(request: NextRequest) {
  try {
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

    const { name, template_type, category, content_json, variables } = await request.json()
    if (!name) return NextResponse.json({ error: "テンプレート名は必須です" }, { status: 400 })

    // Pack extended fields into the content column as JSON
    const content = JSON.stringify({
      template_type: template_type || "text",
      content_json: content_json || {},
      variables: variables || [],
      is_active: true,
      used_count: 0,
    })

    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        organization_id: orgId,
        name,
        category: category || "general",
        content,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "同じ名前のテンプレートが既に存在します" }, { status: 409 })
      }
      throw error
    }

    // Return parsed response
    let contentData: Record<string, unknown> = {}
    try {
      contentData = JSON.parse(data.content)
    } catch {
      contentData = { text: data.content }
    }

    return NextResponse.json({
      data: {
        ...data,
        template_type: contentData.template_type || "text",
        content_json: contentData.content_json || {},
        variables: contentData.variables || [],
        is_active: contentData.is_active !== false,
        used_count: (contentData.used_count as number) || 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("MessageTemplate POST error:", error)
    return NextResponse.json({ error: "テンプレートの作成に失敗しました" }, { status: 500 })
  }
}
