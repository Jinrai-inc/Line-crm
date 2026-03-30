import { NextRequest, NextResponse } from "next/server"

// LINE接続テストAPI
export async function POST(request: NextRequest) {
  try {
    const { channelAccessToken } = await request.json()

    if (!channelAccessToken) {
      return NextResponse.json(
        { success: false, error: "アクセストークンが必要です" },
        { status: 400 }
      )
    }

    // LINE APIにテストリクエスト（Bot情報取得）
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      let errorMessage = "LINE APIへの接続に失敗しました"

      if (res.status === 401) {
        errorMessage = "アクセストークンが無効です。正しいトークンを入力してください。"
      } else if (res.status === 403) {
        errorMessage = "このチャネルへのアクセス権がありません。"
      }

      return NextResponse.json(
        { success: false, error: errorMessage, details: errorText },
        { status: 200 }
      )
    }

    const botInfo = await res.json()

    return NextResponse.json({
      success: true,
      botInfo: {
        displayName: botInfo.displayName,
        userId: botInfo.userId,
        basicId: botInfo.basicId,
        pictureUrl: botInfo.pictureUrl,
      },
    })
  } catch (error) {
    console.error("LINE test error:", error)
    return NextResponse.json(
      { success: false, error: "接続テストに失敗しました。ネットワークを確認してください。" },
      { status: 500 }
    )
  }
}
