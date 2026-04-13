import { pushMessage } from "@/lib/line/client"

// =============================================================================
// 管理者通知ヘルパー
//
// CRM 内で「フォローアップ応答ボタンが押された」などの重要イベントが
// 発生したときに、運営の管理者に LINE / Slack / メールで通知を飛ばす。
//
// 設定は Vercel の環境変数で管理する（v1）:
//
//   ADMIN_NOTIFICATION_LINE_USER_IDS
//     カンマ区切りの LINE user ID。例: "U1234567890abcdef,Uabcdef..."
//     管理者本人が bot を友だち追加した上で取得した user ID を入れる。
//     CRM の友だち一覧で line_user_id を確認できる。
//
//   ADMIN_NOTIFICATION_SLACK_WEBHOOK_URL
//     Slack Incoming Webhook の URL。例: "https://hooks.slack.com/services/T.../B.../..."
//     Slack 側で「アプリ追加 → Incoming Webhooks → 投稿先チャンネル選択 →
//     Webhook URL コピー」で取得できる。
//
// どちらも未設定なら何もせず終了する（ノーオペ）。
// 一方だけ設定されていればその経路にだけ通知する。
// =============================================================================

export interface AdminNotificationContext {
  /** イベントが発生した組織の LINE channel access token */
  channelAccessToken: string
}

export interface NotificationContent {
  /** 通知のタイトル（例: "🔔 フォローアップ応答がありました"） */
  title: string
  /** 本文（行ごと配列。ラベル: 値 形式が望ましい） */
  lines: string[]
}

// LINE への通知（管理者本人の LINE トークに pushMessage で送る）
async function notifyAdminLine(
  context: AdminNotificationContext,
  content: NotificationContent
): Promise<void> {
  const userIdsRaw = process.env.ADMIN_NOTIFICATION_LINE_USER_IDS
  if (!userIdsRaw) return

  const userIds = userIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (userIds.length === 0) return

  const text = `${content.title}\n\n${content.lines.join("\n")}`

  // 複数の管理者に並列で送る
  await Promise.allSettled(
    userIds.map((userId) =>
      pushMessage(userId, [{ type: "text", text }], {
        accessToken: context.channelAccessToken,
      }).catch((err) => {
        console.error("[admin-notify] LINE push failed", { userId, err })
      })
    )
  )
}

// Slack への通知（Incoming Webhook に POST）
async function notifyAdminSlack(content: NotificationContent): Promise<void> {
  const webhookUrl = process.env.ADMIN_NOTIFICATION_SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  // Slack のシンプルな text 形式。`*太字*` で強調できる。
  const text = `*${content.title}*\n${content.lines.join("\n")}`

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const responseText = await res.text().catch(() => "")
      console.error("[admin-notify] Slack post non-2xx", {
        status: res.status,
        body: responseText,
      })
    }
  } catch (err) {
    console.error("[admin-notify] Slack post failed", err)
  }
}

/**
 * 管理者向け通知を全経路に送信する（設定されている経路だけ実行）。
 *
 * - LINE / Slack を並列で実行
 * - どちらも未設定なら何もしない
 * - 失敗してもエラーを呼び出し元に伝搬しない（呼び出し元の処理を阻害しない）
 *
 * 使い方:
 *   await notifyAdmin(
 *     { channelAccessToken: context.channelAccessToken },
 *     {
 *       title: "🔔 フォローアップ応答がありました",
 *       lines: [
 *         "友だち: 松永 宜子",
 *         "ボタン: 個別相談希望",
 *         "時刻: 2026-04-13 11:30",
 *       ],
 *     }
 *   )
 */
export async function notifyAdmin(
  context: AdminNotificationContext,
  content: NotificationContent
): Promise<void> {
  await Promise.allSettled([
    notifyAdminLine(context, content),
    notifyAdminSlack(content),
  ])
}
