import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessage } from "@/lib/line/client"

export const maxDuration = 300

// ステップ配信のcron処理（Vercel Cronまたは外部cronで定期実行）
export async function GET(request: NextRequest) {
  // 簡易認証（cronシークレット）
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  try {
    // 送信待ちキューを取得（送信予定時刻が過ぎているもの）
    const { data: queue } = await (admin
      .from("step_message_queue" as never)
      .select("*")
      .eq("status" as never, "pending")
      .lte("scheduled_at" as never, now.toISOString())
      .limit(100) as unknown as Promise<{
        data: Array<{
          id: string
          organization_id: string
          friend_id: string
          line_user_id: string
          message: string
          step_index: number
          scheduled_at: string
          status: string
        }> | null
        error: unknown
      }>)

    if (!queue || queue.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    // 組織ごとにLINEアカウント情報をキャッシュ
    const tokenCache: Record<string, string> = {}
    // 友だち名をキャッシュ
    const nameCache: Record<string, string> = {}

    let sentCount = 0
    let failedCount = 0

    for (const item of queue) {
      try {
        // アクセストークン取得
        if (!tokenCache[item.organization_id]) {
          const { data: lineAccount } = await admin
            .from("line_accounts")
            .select("channel_access_token")
            .eq("organization_id", item.organization_id)
            .single()
          if (lineAccount?.channel_access_token) {
            tokenCache[item.organization_id] = lineAccount.channel_access_token
          }
        }

        const accessToken = tokenCache[item.organization_id]
        if (!accessToken) {
          await (admin
            .from("step_message_queue" as never)
            .update({ status: "failed", error: "no_token" } as never)
            .eq("id" as never, item.id) as unknown as Promise<{ error: unknown }>)
          failedCount++
          continue
        }

        // 友だちの名前を取得（{name}置換用）
        if (!nameCache[item.friend_id]) {
          const { data: friend } = await admin
            .from("friends")
            .select("display_name, custom_name")
            .eq("id", item.friend_id)
            .single()
          nameCache[item.friend_id] = (friend as { custom_name?: string } | null)?.custom_name
            || (friend as { display_name?: string } | null)?.display_name || "お客様"
        }

        // {name}タグを置換
        const personalizedMessage = item.message
          .replace(/\{name\}/g, nameCache[item.friend_id])
          .replace(/\{名前\}/g, nameCache[item.friend_id])

        // メッセージ送信
        await pushMessage(
          item.line_user_id,
          [{ type: "text", text: personalizedMessage }],
          { accessToken }
        )

        // 送信完了
        await (admin
          .from("step_message_queue" as never)
          .update({ status: "sent", sent_at: now.toISOString() } as never)
          .eq("id" as never, item.id) as unknown as Promise<{ error: unknown }>)
        sentCount++
      } catch {
        // 送信失敗
        await (admin
          .from("step_message_queue" as never)
          .update({ status: "failed" } as never)
          .eq("id" as never, item.id) as unknown as Promise<{ error: unknown }>)
        failedCount++
      }
    }

    return NextResponse.json({ processed: queue.length, sentCount, failedCount })
  } catch (error) {
    console.error("Step messages cron error:", error)
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 })
  }
}
