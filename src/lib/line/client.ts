const LINE_API_BASE = "https://api.line.me/v2/bot"

interface LineApiOptions {
  accessToken: string
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

// プッシュメッセージ送信
export async function pushMessage(
  to: string,
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
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

// マルチキャスト送信
export async function multicast(
  to: string[],
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/multicast`, {
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

// ブロードキャスト送信
export async function broadcast(
  messages: unknown[],
  options: LineApiOptions
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
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
