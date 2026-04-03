import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// 自組織情報取得
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: "組織情報が見つかりません" }, { status: 404 })
    }

    return NextResponse.json(org)
  } catch (error) {
    console.error("組織情報取得エラー:", error)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}

// 自組織情報更新
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()

    // 許可されたフィールドのみ更新
    const allowedFields = [
      "name",
      "purpose",
      "description",
      "business_category",
      "contact_email",
      "contact_phone",
      "enabled_modules",
      "product_tour_completed",
      "onboarding_completed",
    ]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 })
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", orgId)
      .select()
      .single()

    if (error) {
      console.error("組織情報更新エラー:", error)
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
    }

    return NextResponse.json(org)
  } catch (error) {
    console.error("組織情報更新エラー:", error)
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 })
  }
}
