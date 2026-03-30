import { NextRequest, NextResponse } from "next/server"
import { validateSignature } from "@/lib/line/signature"
import { handleWebhookEvent } from "@/lib/line/webhook"
import { createAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature")

    if (!signature) {
      return NextResponse.json({ error: "署名がありません" }, { status: 400 })
    }

    // line_accountsテーブルから全アカウントを取得して署名検証
    const supabase = createAdminClient()
    const { data: lineAccounts } = await supabase
      .from("line_accounts")
      .select("id, organization_id, channel_name, channel_secret, channel_access_token")
      .eq("webhook_active", true)

    if (!lineAccounts || lineAccounts.length === 0) {
      return NextResponse.json({ error: "LINE設定がありません" }, { status: 404 })
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
      return NextResponse.json({ error: "署名検証に失敗しました" }, { status: 401 })
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
    // LINEにはエラーでも200を返す（リトライ防止）
    return NextResponse.json({ status: "error" }, { status: 200 })
  }
}

// bodyParserを無効化（署名検証のためraw bodyが必要）
export const runtime = "nodejs"
