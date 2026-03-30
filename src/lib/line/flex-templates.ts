import { flexMessage } from "./messages"

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
