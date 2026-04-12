import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

// status の許可リスト（任意の文字列を受け付けると DB 制約や配信ロジックを壊し得る）
const ALLOWED_STATUSES = ["active", "blocked", "unfollowed"] as const
type FriendStatus = (typeof ALLOWED_STATUSES)[number]

// 友だち詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 詳細画面の message_logs を確実に取得するため admin で読む
    // （webhook 由来のログと配信ログの両方を見たい）
    const supabase = createAdminClient()

    const { data: friend, error } = await supabase
      .from("friends")
      .select(`
        *,
        friend_tags(tag_id, tags(id, name, color)),
        attendances(id, status, applied_at, seminars(id, title, event_date)),
        message_logs(id, event_type, message_type, content, created_at)
      `)
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (error) throw error
    if (!friend) return NextResponse.json({ error: "友だちが見つかりません" }, { status: 404 })

    return NextResponse.json({ data: friend })
  } catch (error) {
    console.error("Friend GET error:", error)
    return NextResponse.json({ error: "友だち詳細の取得に失敗しました" }, { status: 500 })
  }
}

// 友だち情報更新
//
// status を含めて更新できる。status 更新は CRM 側で管理者が手動で
// ブロック/ブロック解除を行う際に使う（LINE 側の webhook 経由とは独立）。
// status は配信対象判定に直結するため、許可リスト以外の値は弾く。
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 書き込みは admin で（friends RLS のサブクエリ評価で silent fail を避ける）
    // 組織境界は明示的な .eq("organization_id", orgId) で担保
    const supabase = createAdminClient()

    const body = await request.json()
    const { customName, email, phone, memo, status } = body

    // 更新対象を絞ってビルド（送られた項目だけを update）
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (customName !== undefined) updateData.custom_name = customName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (memo !== undefined) updateData.memo = memo

    // status の検証
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status as FriendStatus)) {
        return NextResponse.json(
          {
            error: `status は ${ALLOWED_STATUSES.join(" / ")} のいずれかを指定してください`,
          },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const { data, error } = await supabase
      .from("friends")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: "友だちが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Friend PATCH error:", error)
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
  }
}

// 友だち削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // 削除も admin で実行 + organization_id で安全側に絞る
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Friend DELETE error:", error)
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 })
  }
}
