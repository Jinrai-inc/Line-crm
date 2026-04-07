// テキストメッセージ作成
export function textMessage(text: string) {
  return { type: "text", text }
}

// 画像メッセージ作成
export function imageMessage(originalContentUrl: string, previewImageUrl?: string) {
  return {
    type: "image",
    originalContentUrl,
    previewImageUrl: previewImageUrl || originalContentUrl,
  }
}

// 動画メッセージ作成
export function videoMessage(originalContentUrl: string, previewImageUrl: string) {
  return {
    type: "video",
    originalContentUrl,
    previewImageUrl,
  }
}

// Flex Messageラッパー
export function flexMessage(altText: string, contents: unknown) {
  return {
    type: "flex",
    altText,
    contents,
  }
}

// ウェルカムメッセージ作成
export function createWelcomeMessage(channelName: string) {
  return flexMessage("友だち追加ありがとうございます！", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${channelName}へようこそ！`,
          weight: "bold",
          size: "xl",
          margin: "md",
        },
        {
          type: "text",
          text: "友だち追加ありがとうございます。\n以下のメニューからご利用いただけます。",
          wrap: true,
          color: "#666666",
          size: "sm",
          margin: "md",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "message",
            label: "セミナー一覧",
            text: "セミナー一覧",
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "message",
            label: "参加履歴",
            text: "参加履歴",
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "message",
            label: "お問い合わせ",
            text: "お問い合わせ",
          },
        },
      ],
    },
  })
}

// デフォルト応答メッセージ
export function createDefaultReply() {
  return textMessage(
    "ご利用ありがとうございます。\n\n以下のキーワードで操作できます：\n" +
      "・「セミナー一覧」- 募集中のセミナーを表示\n" +
      "・「参加申込 番号」- セミナーに申し込み\n" +
      "・「参加履歴」- 参加履歴を確認\n" +
      "・「キャンセル 番号」- 申込をキャンセル\n" +
      "・「コーチング予約」- コーチングを予約\n" +
      "・「予約確認」- 予約を確認\n" +
      "・「予約キャンセル」- 予約をキャンセル"
  )
}
