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
