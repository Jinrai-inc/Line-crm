const LINE_API_BASE = "https://api.line.me/v2/bot"

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number }
  action: { type: string; [key: string]: unknown }
}

export interface RichMenuObject {
  size: { width: number; height: number }
  selected: boolean
  name: string
  chatBarText: string
  areas: RichMenuArea[]
}

// リッチメニュー一覧取得
export async function listRichMenus(
  accessToken: string
): Promise<{ richmenus: RichMenuObject[] }> {
  const res = await fetch(`${LINE_API_BASE}/richmenu/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE API error: ${res.status} ${error}`)
  }

  return res.json()
}

// リッチメニュー作成
export async function createRichMenu(
  accessToken: string,
  menu: RichMenuObject
): Promise<string> {
  const res = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(menu),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE richmenu create error: ${res.status} ${error}`)
  }

  const data = await res.json()
  return data.richMenuId
}

// リッチメニュー画像アップロード
export async function uploadRichMenuImage(
  accessToken: string,
  richMenuId: string,
  imageBuffer: Buffer,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${accessToken}`,
      },
      body: new Uint8Array(imageBuffer),
    }
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE richmenu image upload error: ${res.status} ${error}`)
  }
}

// デフォルトリッチメニュー設定
export async function setDefaultRichMenu(
  accessToken: string,
  richMenuId: string
): Promise<void> {
  const res = await fetch(
    `${LINE_API_BASE}/user/all/richmenu/${richMenuId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE set default richmenu error: ${res.status} ${error}`)
  }
}

// デフォルトリッチメニュー取得
export async function getDefaultRichMenu(
  accessToken: string
): Promise<string | null> {
  const res = await fetch(`${LINE_API_BASE}/user/all/richmenu`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE get default richmenu error: ${res.status} ${error}`)
  }

  const data = await res.json()
  return data.richMenuId
}

// デフォルトリッチメニュー解除
export async function removeDefaultRichMenu(
  accessToken: string
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/user/all/richmenu`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(
      `LINE remove default richmenu error: ${res.status} ${error}`
    )
  }
}

// リッチメニュー削除
export async function deleteRichMenu(
  accessToken: string,
  richMenuId: string
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE delete richmenu error: ${res.status} ${error}`)
  }
}

// リッチメニュー画像取得URL
export function getRichMenuImageUrl(richMenuId: string): string {
  return `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`
}
