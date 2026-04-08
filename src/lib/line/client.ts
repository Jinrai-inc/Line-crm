const LINE_API_BASE = "https://api.line.me/v2/bot"

interface LineApiOptions {
  accessToken: string
}

// リトライ付きfetch（429レート制限やネットワークエラー対応）
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init)

    // 429 (Rate Limit) or 5xx → リトライ
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }

    return res
  }
  // ここには到達しないが型安全のため
  return fetch(url, init)
}

/**
 * バッチ送信ユーティリティ
 * pushMessageを並列バッチで送信（multicastが使えないFlexMessage向け）
 * concurrency: 同時実行数（デフォルト10）
 */
export async function pushMessageBatch(
  userIds: string[],
  messages: unknown[],
  options: LineApiOptions,
  concurrency = 10
): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0
  let failedCount = 0

  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      batch.map((userId) =>
        pushMessage(userId, messages, options)
      )
    )
    for (const r of results) {
      if (r.status === "fulfilled") sentCount++
      else failedCount++
    }
  }

  return { sentCount, failedCount }
}

/**
 * multicastバッチ送信ユーティリティ
 * 500件ずつmulticastで送信
 */
export async function multicastBatch(
  userIds: string[],
  messages: unknown[],
  options: LineApiOptions
): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0
  let failedCount = 0

  for (let i = 0; i < userIds.length; i += 500) {
    const batch = userIds.slice(i, i + 500)
    try {
      await multicast(batch, messages, options)
      sentCount += batch.length
    } catch {
      failedCount += batch.length
    }
  }

  return { sentCount, failedCount }
}

// LINEプロフィール取得
export async function getProfile(
  userId: string,
  options: LineApiOptions
): Promise<{
  displayName: string
  userId: string
  pictureUrl?: string
  statusMessage?: string
}> {
  const res = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`LINE API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// 返信メッセージ送信
export async function replyMessage(
  replyToken: string,
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE reply error: ${res.status} ${error}`)
  }
}

// プッシュメッセージ送信（リトライ付き）
export async function pushMessage(
  to: string,
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetchWithRetry(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE push error: ${res.status} ${error}`)
  }
}

// マルチキャスト送信（リトライ付き）
export async function multicast(
  to: string[],
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetchWithRetry(`${LINE_API_BASE}/message/multicast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE multicast error: ${res.status} ${error}`)
  }
}

// ブロードキャスト送信（リトライ付き）
export async function broadcast(
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetchWithRetry(`${LINE_API_BASE}/message/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE broadcast error: ${res.status} ${error}`)
  }
}
