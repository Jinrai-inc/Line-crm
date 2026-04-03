import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, displayName, organizationName } = body

    if (!email || !password || !organizationName) {
      return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const admin = createAdminClient()

    // 1. Supabase Authでユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          organization_name: organizationName,
        },
      },
    })

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "ユーザーの作成に失敗しました" }, { status: 500 })
    }

    // 2. 組織を作成（adminクライアントでRLSバイパス）
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: organizationName })
      .select()
      .single()

    if (orgError) {
      console.error("Organization creation error:", orgError)
      return NextResponse.json({ error: "組織の作成に失敗しました" }, { status: 500 })
    }

    // 3. usersテーブルにレコード作成（adminクライアントでRLSバイパス）
    const { error: userError } = await admin
      .from("users")
      .insert({
        id: authData.user.id,
        organization_id: org.id,
        email,
        display_name: displayName || null,
        role: "owner",
      })

    if (userError) {
      console.error("User creation error:", userError)
      return NextResponse.json({ error: "ユーザー情報の保存に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 })
  }
}
