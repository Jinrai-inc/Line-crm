import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// タグ一覧取得
export async function GET() {
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

    const { data: tags, error } = await supabase
      .from("tags")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return NextResponse.json({ data: tags || [] })
  } catch (error) {
    console.error("Tags GET error:", error)
    return NextResponse.json({ error: "タグ一覧の取得に失敗しました" }, { status: 500 })
  }
}

// タグ新規作成
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

    const { name, color, description } = await request.json()
    if (!name) return NextResponse.json({ error: "タグ名は必須です" }, { status: 400 })

    const { data, error } = await supabase
      .from("tags")
      .insert({
        organization_id: orgId,
        name,
        color: color || "#3B82F6",
        description,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Tag POST error:", error)
    return NextResponse.json({ error: "タグの作成に失敗しました" }, { status: 500 })
  }
}
