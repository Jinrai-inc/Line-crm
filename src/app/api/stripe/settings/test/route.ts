import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

// Stripe接続テスト（サーバーサイドでシークレットキーを使用）
export async function POST() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: settings } = await supabase
      .from("stripe_settings")
      .select("stripe_secret_key")
      .eq("organization_id", orgId)
      .single()

    if (!settings?.stripe_secret_key) {
      return NextResponse.json(
        { error: "シークレットキーが設定されていません。先に保存してください。" },
        { status: 400 }
      )
    }

    // サーバーサイドでStripe APIにテストリクエスト
    const testRes = await fetch("https://api.stripe.com/v1/customers?limit=1", {
      headers: {
        Authorization: `Bearer ${settings.stripe_secret_key}`,
      },
    })

    if (testRes.ok) {
      return NextResponse.json({ success: true, message: "Stripeとの接続に成功しました" })
    } else {
      const errorData = await testRes.json()
      return NextResponse.json(
        { error: errorData.error?.message || "接続テストに失敗しました" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Stripe test error:", error)
    return NextResponse.json({ error: "接続テストに失敗しました" }, { status: 500 })
  }
}
