import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

const ALLOWED_STATUSES = new Set(["pending", "paid", "refunded", "failed"])

// 個別の支払いステータスを手動で更新する
// Stripe Webhook が届かない / 静的 Payment Link で支払われた等で
// 自動同期が効かない場合の最終手段として使う
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "有効な status を指定してください (pending/paid/refunded/failed)" },
        { status: 400 }
      )
    }

    // 組織を跨いだ更新を防ぐため organization_id も条件に含める
    const updatePatch: Record<string, unknown> = { status }
    const nowIso = new Date().toISOString()
    if (status === "paid") {
      updatePatch.paid_at = nowIso
    } else if (status === "refunded") {
      updatePatch.refunded_at = nowIso
    }

    const { data, error } = await supabase
      .from("payments")
      .update(updatePatch)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single()

    if (error) {
      console.error("Payment manual update error:", error)
      return NextResponse.json(
        { error: `更新に失敗しました: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "対象の支払いが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Payment PATCH error:", error)
    return NextResponse.json(
      { error: "支払いの更新に失敗しました" },
      { status: 500 }
    )
  }
}
