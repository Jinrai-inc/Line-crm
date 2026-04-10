import { flexMessage } from "./messages"

interface CoachingBooking {
  id: string
  date: string
  startTime: string
  endTime?: string
  coachName?: string
  notes?: string
}

interface OmiaiInfo {
  id: string
  memberName: string
  partnerName: string
  date: string
  startTime: string
  location: string
  notes?: string
}

interface PaymentInfo {
  id: string
  memberName: string
  amount: number
  description: string
  paidAt: string
  method?: string
  receiptNumber?: string
}

interface SeminarInfo {
  id: string
  title: string
  eventDate: string
  startTime?: string
  endTime?: string
  location?: string
  capacity: number
  attendeeCount: number
}

// セミナー一覧 Flex Message（カルーセル）
export function createSeminarListMessage(seminars: SeminarInfo[]) {
  if (seminars.length === 0) {
    return {
      type: "text" as const,
      text: "現在募集中のセミナーはありません。",
    }
  }

  const bubbles = seminars.map((seminar, index) => ({
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: seminar.title,
          weight: "bold",
          size: "lg",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "日時", color: "#aaaaaa", size: "sm", flex: 1 },
                {
                  type: "text",
                  text: `${seminar.eventDate}${seminar.startTime ? ` ${seminar.startTime}` : ""}${seminar.endTime ? `〜${seminar.endTime}` : ""}`,
                  wrap: true,
                  size: "sm",
                  flex: 3,
                },
              ],
            },
            ...(seminar.location
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "場所", color: "#aaaaaa", size: "sm" as const, flex: 1 },
                      { type: "text" as const, text: seminar.location, wrap: true, size: "sm" as const, flex: 3 },
                    ],
                  },
                ]
              : []),
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "残席", color: "#aaaaaa", size: "sm", flex: 1 },
                {
                  type: "text",
                  text:
                    seminar.capacity > 0
                      ? `${seminar.capacity - seminar.attendeeCount}名`
                      : "制限なし",
                  size: "sm",
                  flex: 3,
                  color:
                    seminar.capacity > 0 && seminar.capacity - seminar.attendeeCount <= 3
                      ? "#FF0000"
                      : "#111111",
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "postback",
            label: "申し込む",
            data: `action=apply_seminar&seminar_id=${seminar.id}&index=${index + 1}`,
            displayText: `参加申込 ${index + 1}`,
          },
        },
      ],
    },
  }))

  return flexMessage("募集中のセミナー一覧", {
    type: "carousel",
    contents: bubbles,
  })
}

// 申込完了 Flex Message
export function createApplyConfirmMessage(seminar: SeminarInfo) {
  return flexMessage("セミナー申込を受け付けました", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "✅ お申込を受け付けました",
          weight: "bold",
          size: "lg",
          color: "#06C755",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            { type: "text", text: seminar.title, weight: "bold", size: "md", wrap: true },
            {
              type: "text",
              text: `📅 ${seminar.eventDate}${seminar.startTime ? ` ${seminar.startTime}` : ""}${seminar.endTime ? `〜${seminar.endTime}` : ""}`,
              size: "sm",
              margin: "md",
            },
            ...(seminar.location
              ? [{ type: "text" as const, text: `📍 ${seminar.location}`, size: "sm" as const, margin: "sm" as const }]
              : []),
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "secondary",
          action: {
            type: "postback",
            label: "キャンセルする",
            data: `action=cancel_seminar&seminar_id=${seminar.id}`,
            displayText: "キャンセル",
          },
        },
      ],
    },
  })
}

// コーチング予約確認 Flex Message
export function createCoachingBookingMessage(booking: CoachingBooking) {
  return flexMessage("コーチング予約確認", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "コーチング予約確認",
          weight: "bold",
          size: "lg",
          color: "#06C755",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "日付", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: booking.date, size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "時間", color: "#aaaaaa", size: "sm", flex: 2 },
                {
                  type: "text",
                  text: `${booking.startTime}${booking.endTime ? `〜${booking.endTime}` : ""}`,
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            ...(booking.coachName
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "担当", color: "#aaaaaa", size: "sm" as const, flex: 2 },
                      { type: "text" as const, text: booking.coachName, size: "sm" as const, flex: 5 },
                    ],
                  },
                ]
              : []),
            ...(booking.notes
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "備考", color: "#aaaaaa", size: "sm" as const, flex: 2 },
                      { type: "text" as const, text: booking.notes, wrap: true, size: "sm" as const, flex: 5 },
                    ],
                  },
                ]
              : []),
          ],
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
          style: "secondary",
          action: {
            type: "postback",
            label: "予約をキャンセル",
            data: `action=cancel_coaching&booking_id=${booking.id}`,
            displayText: "予約キャンセル",
          },
        },
      ],
    },
  })
}

// 結婚スクールメンバー向けウェルカムメッセージ
export function createMemberWelcomeMessage(memberName: string) {
  return flexMessage("ご入会ありがとうございます", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ご入会ありがとうございます",
          weight: "bold",
          size: "lg",
          color: "#06C755",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "text",
          text: `${memberName}様、結婚スクールへのご入会ありがとうございます。`,
          wrap: true,
          size: "sm",
          margin: "lg",
        },
        {
          type: "text",
          text: "これから一緒に素敵なパートナーとの出会いを見つけていきましょう。まずは以下のメニューをご確認ください。",
          wrap: true,
          size: "sm",
          color: "#666666",
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
            label: "コーチング予約",
            text: "コーチング予約",
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "message",
            label: "プロフィール設定",
            text: "プロフィール設定",
          },
        },
      ],
    },
  })
}

// お見合いスケジュール通知 Flex Message
export function createOmiaiScheduleMessage(omiai: OmiaiInfo) {
  return flexMessage("お見合いのご案内", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "お見合いのご案内",
          weight: "bold",
          size: "lg",
          color: "#E91E8C",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "お相手", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: omiai.partnerName, weight: "bold", size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "日時", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: `${omiai.date} ${omiai.startTime}`, size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "場所", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: omiai.location, wrap: true, size: "sm", flex: 5 },
              ],
            },
            ...(omiai.notes
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "備考", color: "#aaaaaa", size: "sm" as const, flex: 2 },
                      { type: "text" as const, text: omiai.notes, wrap: true, size: "sm" as const, flex: 5 },
                    ],
                  },
                ]
              : []),
          ],
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
          color: "#E91E8C",
          action: {
            type: "postback",
            label: "参加する",
            data: `action=confirm_omiai&omiai_id=${omiai.id}`,
            displayText: "参加します",
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "postback",
            label: "辞退する",
            data: `action=decline_omiai&omiai_id=${omiai.id}`,
            displayText: "辞退します",
          },
        },
      ],
    },
  })
}

// セミナーフォローアップ Flex Message
export function createFollowupMessage(
  attendeeName: string,
  thankYouMessage: string,
  buttons: Array<{ label: string; tagName: string; responseMessage: string; responseUrl: string }>,
  seminarId: string
): Record<string, unknown> {
  const personalizedMessage = thankYouMessage.replace(/\{name\}/g, attendeeName)

  return flexMessage("セミナーフォローアップ", {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#06C755",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: personalizedMessage,
          color: "#FFFFFF",
          weight: "bold",
          size: "md",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "タップ後に特典をお渡しします",
          weight: "bold",
          size: "md",
          wrap: true,
        },
        {
          type: "text",
          text: "どちらか1つだけタップしてください。",
          size: "sm",
          color: "#888888",
          margin: "sm",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "lg",
      contents: buttons.map((button, index) => ({
        type: "button",
        style: "primary",
        color: "#06C755",
        height: "md",
        action: {
          type: "postback",
          label: button.label,
          data: `action=followup_response&seminar_id=${seminarId}&button_index=${index}`,
          displayText: button.label,
        },
      })),
    },
  })
}

// フォローアップ応答 Flex Message
export function createFollowupResponseMessage(
  responseMessage: string,
  responseUrl?: string
): Record<string, unknown> {
  const bodyContents: unknown[] = [
    {
      type: "text",
      text: responseMessage,
      wrap: true,
      size: "md",
    },
  ]

  const footerContents: unknown[] = []

  if (responseUrl) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#06C755",
      action: {
        type: "uri",
        label: "リンクを開く",
        uri: responseUrl,
      },
    })
  }

  return flexMessage("フォローアップ", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "lg",
      contents: bodyContents,
    },
    ...(footerContents.length > 0
      ? {
          footer: {
            type: "box",
            layout: "vertical",
            paddingAll: "lg",
            contents: footerContents,
          },
        }
      : {}),
  })
}

// 支払い領収書 Flex Message
export function createPaymentReceiptMessage(payment: PaymentInfo) {
  return flexMessage("お支払い領収書", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "お支払い領収書",
          weight: "bold",
          size: "lg",
          color: "#06C755",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "会員名", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: payment.memberName, size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "内容", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: payment.description, wrap: true, size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "金額", color: "#aaaaaa", size: "sm", flex: 2 },
                {
                  type: "text",
                  text: `¥${payment.amount.toLocaleString()}`,
                  weight: "bold",
                  size: "md",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "日時", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: payment.paidAt, size: "sm", flex: 5 },
              ],
            },
            ...(payment.method
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "支払方法", color: "#aaaaaa", size: "sm" as const, flex: 2 },
                      { type: "text" as const, text: payment.method, size: "sm" as const, flex: 5 },
                    ],
                  },
                ]
              : []),
            ...(payment.receiptNumber
              ? [
                  {
                    type: "box" as const,
                    layout: "baseline" as const,
                    spacing: "sm" as const,
                    contents: [
                      { type: "text" as const, text: "領収番号", color: "#aaaaaa", size: "sm" as const, flex: 2 },
                      { type: "text" as const, text: payment.receiptNumber, size: "sm" as const, flex: 5 },
                    ],
                  },
                ]
              : []),
          ],
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "text",
          text: "ご利用ありがとうございます。",
          size: "xs",
          color: "#aaaaaa",
          margin: "lg",
          align: "center",
        },
      ],
    },
  })
}

// アンケート Flex Message
interface SurveyQuestion {
  label: string
  choices: {
    text: string
    tagName: string
    rewardMessage?: string
    rewardUrl?: string
  }[]
}

interface SurveyMessageParams {
  seminarId: string
  seminarTitle: string
  surveyTitle: string
  questions: SurveyQuestion[]
}

export function createSurveyMessage(params: SurveyMessageParams) {
  const { seminarId, seminarTitle, surveyTitle, questions } = params

  const bubbles = questions.map((question, qIndex) => {
    const choiceButtons = question.choices.map((choice, cIndex) => ({
      type: "button" as const,
      style: "primary" as const,
      color: "#06C755",
      height: "sm" as const,
      action: {
        type: "postback" as const,
        label: choice.text,
        data: `action=survey_answer&seminar_id=${seminarId}&q=${qIndex}&c=${cIndex}`,
        displayText: choice.text,
      },
    }))

    return {
      type: "bubble" as const,
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          { type: "text" as const, text: "📋 " + surveyTitle, weight: "bold" as const, size: "md" as const, color: "#06C755" },
          { type: "text" as const, text: seminarTitle, size: "xs" as const, color: "#999999", margin: "sm" as const },
          { type: "separator" as const, margin: "lg" as const },
          { type: "text" as const, text: question.label, weight: "bold" as const, size: "md" as const, margin: "lg" as const, wrap: true as const },
          { type: "text" as const, text: "以下からお選びください", size: "xs" as const, color: "#999999", margin: "sm" as const },
        ],
      },
      footer: { type: "box" as const, layout: "vertical" as const, spacing: "sm" as const, contents: choiceButtons },
    }
  })

  if (bubbles.length === 1) return flexMessage(surveyTitle, bubbles[0])
  return flexMessage(surveyTitle, { type: "carousel", contents: bubbles })
}

// 1問だけのアンケートメッセージ（段階的送信用）
export function createSingleQuestionMessage(params: {
  surveyId: string
  surveyTitle: string
  question: SurveyQuestion
  questionIndex: number
  totalQuestions: number
}) {
  const { surveyId, surveyTitle, question, questionIndex, totalQuestions } = params

  const choiceButtons = question.choices.map((choice, cIndex) => ({
    type: "button" as const,
    style: "primary" as const,
    color: "#06C755",
    height: "sm" as const,
    action: {
      type: "postback" as const,
      label: choice.text,
      data: `action=survey_answer&seminar_id=${surveyId}&q=${questionIndex}&c=${cIndex}`,
      displayText: choice.text,
    },
  }))

  return flexMessage(`${surveyTitle} (${questionIndex + 1}/${totalQuestions})`, {
    type: "bubble" as const,
    body: {
      type: "box" as const,
      layout: "vertical" as const,
      contents: [
        { type: "text" as const, text: "📋 " + surveyTitle, weight: "bold" as const, size: "md" as const, color: "#06C755" },
        { type: "text" as const, text: `質問 ${questionIndex + 1} / ${totalQuestions}`, size: "xs" as const, color: "#999999", margin: "sm" as const },
        { type: "separator" as const, margin: "lg" as const },
        { type: "text" as const, text: question.label, weight: "bold" as const, size: "md" as const, margin: "lg" as const, wrap: true as const },
        { type: "text" as const, text: "以下からお選びください", size: "xs" as const, color: "#999999", margin: "sm" as const },
      ],
    },
    footer: { type: "box" as const, layout: "vertical" as const, spacing: "sm" as const, contents: choiceButtons },
  })
}

// アンケート回答後の特典送信 Flex Message
export function createSurveyRewardMessage(
  thankMessage: string,
  rewardUrl?: string,
  fileName?: string
) {
  const bodyContents: unknown[] = [
    { type: "text", text: "🎁 特典のお届け", weight: "bold", size: "lg", color: "#06C755" },
    { type: "separator", margin: "lg" },
    { type: "text", text: thankMessage, wrap: true, size: "sm", margin: "lg" },
  ]

  const footerContents: unknown[] = []
  if (rewardUrl) {
    const isPdf = rewardUrl.toLowerCase().endsWith(".pdf") || (fileName?.toLowerCase().endsWith(".pdf"))
    footerContents.push({
      type: "button", style: "primary", color: "#06C755",
      action: { type: "uri", label: isPdf ? "📄 PDFを開く" : "🎁 特典を受け取る", uri: rewardUrl },
    })
  }

  return flexMessage("特典のお届け", {
    type: "bubble",
    body: { type: "box", layout: "vertical", contents: bodyContents },
    ...(footerContents.length > 0
      ? { footer: { type: "box", layout: "vertical", spacing: "sm", contents: footerContents } }
      : {}),
  })
}

// PDF/ファイル配信メッセージ（Flex Message）
export function createFileDeliveryMessage(
  title: string,
  description: string,
  fileUrl: string,
  fileName: string
) {
  const isPdf = fileName.toLowerCase().endsWith(".pdf")
  return flexMessage(title || "ファイルのお届け", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: isPdf ? "📄 PDF" : "📎 ファイル", size: "xs", color: "#06C755", weight: "bold" },
        { type: "text", text: title || fileName, weight: "bold", size: "lg", margin: "sm", wrap: true },
        ...(description
          ? [{ type: "separator", margin: "lg" }, { type: "text", text: description, wrap: true, size: "sm", color: "#666666", margin: "lg" }]
          : []),
        { type: "separator", margin: "lg" },
        {
          type: "box", layout: "horizontal", margin: "lg", contents: [
            { type: "text", text: fileName, size: "xs", color: "#999999", flex: 1, wrap: true },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button", style: "primary", color: "#06C755",
          action: { type: "uri", label: isPdf ? "PDFを開く" : "ファイルを開く", uri: fileUrl },
        },
      ],
    },
  })
}

// 決済リンクメッセージ
export function createPaymentMessage(seminarTitle: string, paymentUrl: string) {
  return flexMessage("お支払いのご案内", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "💳 お支払いのご案内",
          weight: "bold",
          size: "lg",
          color: "#6366F1",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "text",
          text: seminarTitle,
          weight: "bold",
          size: "md",
          margin: "lg",
          wrap: true,
        },
        {
          type: "text",
          text: "お申込みありがとうございます。\n下のボタンからお支払い手続きをお願いいたします。",
          size: "sm",
          color: "#666666",
          margin: "md",
          wrap: true,
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
          color: "#6366F1",
          action: {
            type: "uri",
            label: "お支払いはこちら",
            uri: paymentUrl,
          },
        },
      ],
    },
  })
}

// Zoomリンクメッセージ
export function createZoomLinkMessage(seminarTitle: string, zoomUrl: string) {
  return flexMessage("参加リンクのご案内", {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "🎥 参加リンクのご案内",
          weight: "bold",
          size: "lg",
          color: "#2563EB",
        },
        {
          type: "separator",
          margin: "lg",
        },
        {
          type: "text",
          text: seminarTitle,
          weight: "bold",
          size: "md",
          margin: "lg",
          wrap: true,
        },
        {
          type: "text",
          text: "下のボタンからZoomミーティングにご参加ください。\n開始時間になりましたらタップしてご参加ください。",
          size: "sm",
          color: "#666666",
          margin: "md",
          wrap: true,
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
          color: "#2563EB",
          action: {
            type: "uri",
            label: "Zoomに参加する",
            uri: zoomUrl,
          },
        },
      ],
    },
  })
}
