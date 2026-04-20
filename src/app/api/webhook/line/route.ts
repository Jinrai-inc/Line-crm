import { NextRequest, NextResponse } from "next/server"
import { validateSignature } from "@/lib/line/signature"
import { handleWebhookEvent } from "@/lib/line/webhook"
import { createAdminClient } from "@/lib/supabase/server"

// LINE Webhook は LINE 側が不安定判定して配送を止めてしまうことを避けるため、
// 異常系でも常に HTTP 200 を返す方針とする。エラー原因は console.error と
// レスポンスボディの reason フィールドで Vercel ログから追跡する。
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature")

    if (!signature) {
      console.warn("Webhook: missing x-line-signature header")
      return NextResponse.json({ status: "ignored", reason: "missing_signature" })
    }

    // line_accountsテーブルから全アカウントを取得して署名検証
    const supabase = createAdminClient()
    const { data: lineAccounts } = await supabase
      .from("line_accounts")
      .select("id, organization_id, channel_name, channel_secret, channel_access_token")
      .eq("webhook_active", true)

    if (!lineAccounts || lineAccounts.length === 0) {
      console.warn("Webhook: no active line_accounts (webhook_active=true) found")
      return NextResponse.json({ status: "ignored", reason: "no_active_account" })
    }

    // 各アカウントの署名を検証
    let matchedAccount = null
    for (const account of lineAccounts) {
      if (validateSignature(body, signature, account.channel_secret)) {
        matchedAccount = account
        break
      }
    }

    if (!matchedAccount) {
      console.warn("Webhook: signature validation failed for all registered accounts")
      return NextResponse.json({ status: "ignored", reason: "invalid_signature" })
    }

    const parsed = JSON.parse(body)
    const events = parsed.events || []

    // イベントを非同期で処理（レスポンスは即座に返す）
    const context = {
      organizationId: matchedAccount.organization_id as string,
      lineAccountId: matchedAccount.id,
      channelAccessToken: matchedAccount.channel_access_token,
      channelName: matchedAccount.channel_name,
    }

    // 各イベントを並行処理
    await Promise.allSettled(
      events.map((event: Record<string, unknown>) => handleWebhookEvent(event as never, context))
    )

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Webhook error:", error)
    // LINEにはエラーでも200を返す（リトライ・不安定判定防止）
    return NextResponse.json({ status: "error" })
  }
}

// bodyParserを無効化（署名検証のためraw bodyが必要）
export const runtime = "nodejs"
