import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { pushMessage, multicastBatch } from "@/lib/line/client"
import { createSurveyRewardMessage } from "@/lib/line/flex-templates"

// 大量送信に耐えられるよう Vercel の maxDuration を上限まで引き上げる
export const maxDuration = 300

interface Choice {
  text: string
  tagName?: string
  rewardMessage?: string
  rewardUrl?: string
  file?: { url: string; fileName?: string; mimeType?: string } | null
}

interface Question {
  label: string
  choices: Choice[]
  hasReward?: boolean
}

interface Selection {
  questionIndex: number
  choiceIndex: number
}

function replaceNameTag(text: string, name: string): string {
  return text.replace(/\{name\}/g, name).replace(/\{名前\}/g, name)
}

function messageContainsNameTag(text: string | undefined): boolean {
  if (!text) return false
  return /\{name\}|\{名前\}/.test(text)
}

// 選択肢に紐づく特典メッセージ群を組み立てる
// webhook.ts の送信処理と同じ形（添付ファイル + Flex 特典メッセージ）に揃える
function buildRewardMessages(choice: Choice, name: string): unknown[] {
  const messages: unknown[] = []

  if (choice.file && choice.file.url) {
    if (choice.file.mimeType?.startsWith("image/")) {
      messages.push({
        type: "image",
        originalContentUrl: choice.file.url,
        previewImageUrl: choice.file.url,
      })
    } else {
      messages.push({
        type: "text",
        text: `📎 ${choice.file.fileName || "ファイル"}\n${choice.file.url}`,
      })
    }
  }

  if (choice.rewardMessage || choice.rewardUrl) {
    const rewardMsg = choice.rewardMessage
      ? replaceNameTag(choice.rewardMessage, name)
      : ""
    messages.push(createSurveyRewardMessage(rewardMsg, choice.rewardUrl))
  }

  return messages
}

interface SelectionDetail {
  questionIndex: number
  choiceIndex: number
  questionLabel: string
  choiceText: string
  targetCount: number
  sentCount: number
  failedCount: number
  skipped?: boolean
  reason?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth
    const admin = createAdminClient()

    const body = await request.json()
    const selections = (body?.selections || []) as Selection[]

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        { error: "再送する選択肢を指定してください" },
        { status: 400 }
      )
    }

    // LINE 設定取得
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("channel_access_token")
      .eq("organization_id", orgId)
      .single()

    const channelAccessToken = (lineAccount as { channel_access_token?: string } | null)
      ?.channel_access_token
    if (!channelAccessToken) {
      return NextResponse.json(
        { error: "LINE設定が見つかりません" },
        { status: 404 }
      )
    }

    // アンケート取得
    const { data: survey } = await (admin
      .from("surveys" as never)
      .select("*")
      .eq("id" as never, id)
      .eq("organization_id" as never, orgId)
      .single() as unknown as Promise<{
        data: { id: string; title: string; questions: string | Question[] } | null
        error: unknown
      }>)

    if (!survey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      )
    }

    const questions: Question[] = typeof survey.questions === "string"
      ? JSON.parse(survey.questions)
      : survey.questions || []

    let totalSent = 0
    let totalFailed = 0
    const details: SelectionDetail[] = []

    for (const sel of selections) {
      const { questionIndex, choiceIndex } = sel
      const question = questions[questionIndex]
      const choice = question?.choices?.[choiceIndex]

      if (!question || !choice) {
        details.push({
          questionIndex,
          choiceIndex,
          questionLabel: question?.label || "",
          choiceText: choice?.text || "",
          targetCount: 0,
          sentCount: 0,
          failedCount: 0,
          skipped: true,
          reason: "質問または選択肢が見つかりません",
        })
        continue
      }

      const hasRewardContent = !!(
        choice.rewardMessage || choice.rewardUrl || choice.file
      )
      if (!hasRewardContent) {
        details.push({
          questionIndex,
          choiceIndex,
          questionLabel: question.label,
          choiceText: choice.text,
          targetCount: 0,
          sentCount: 0,
          failedCount: 0,
          skipped: true,
          reason: "この選択肢には特典が設定されていません",
        })
        continue
      }

      // 該当回答者を取得
      const { data: rawResponses } = await (admin
        .from("survey_responses" as never)
        .select("line_user_id, friend_id")
        .eq("survey_id" as never, id)
        .eq("organization_id" as never, orgId)
        .eq("question_index" as never, questionIndex)
        .eq("choice_index" as never, choiceIndex) as unknown as Promise<{
          data: Array<{ line_user_id: string; friend_id: string | null }> | null
          error: unknown
        }>)

      // line_user_id で重複排除（同じ人が2度答えている場合でも1通だけ）
      const seen = new Set<string>()
      const recipients: Array<{ line_user_id: string; friend_id: string | null }> = []
      for (const r of rawResponses || []) {
        if (!r?.line_user_id || seen.has(r.line_user_id)) continue
        seen.add(r.line_user_id)
        recipients.push(r)
      }

      if (recipients.length === 0) {
        details.push({
          questionIndex,
          choiceIndex,
          questionLabel: question.label,
          choiceText: choice.text,
          targetCount: 0,
          sentCount: 0,
          failedCount: 0,
          skipped: true,
          reason: "対象となる回答者が見つかりません",
        })
        continue
      }

      const hasNameTag = messageContainsNameTag(choice.rewardMessage)
      let sentCount = 0
      let failedCount = 0

      if (!hasNameTag) {
        // {name}タグがない場合は全員同じメッセージ → multicast で高速一斉送信
        // （500件ずつ・fetchWithRetry でレート制限対応済み）
        const sharedMessages = buildRewardMessages(choice, "お客様")
        const userIds = recipients.map((r) => r.line_user_id)
        const result = await multicastBatch(userIds, sharedMessages, {
          accessToken: channelAccessToken,
        })
        sentCount = result.sentCount
        failedCount = result.failedCount
      } else {
        // {name}パーソナライズが必要な場合は個別 push
        // 友だち名をまとめて引き、並列バッチで送信
        const friendIds = recipients
          .map((r) => r.friend_id)
          .filter((fid): fid is string => !!fid)
        const nameMap = new Map<string, string>()
        if (friendIds.length > 0) {
          // 友だちIDが多い場合に備えて 1000件ずつに分けて取得
          for (let i = 0; i < friendIds.length; i += 1000) {
            const batch = friendIds.slice(i, i + 1000)
            const { data: friends } = await admin
              .from("friends")
              .select("id, display_name, custom_name")
              .in("id", batch)
            for (const f of (friends || []) as Array<{
              id: string
              display_name: string | null
              custom_name: string | null
            }>) {
              nameMap.set(f.id, f.custom_name || f.display_name || "お客様")
            }
          }
        }

        // 大量送信に備えて並列数を 15 に（既存送信の 10 より少し高め）
        const concurrency = 15
        for (let i = 0; i < recipients.length; i += concurrency) {
          const batch = recipients.slice(i, i + concurrency)
          const results = await Promise.allSettled(
            batch.map((r) => {
              const name =
                (r.friend_id && nameMap.get(r.friend_id)) || "お客様"
              const messages = buildRewardMessages(choice, name)
              return pushMessage(r.line_user_id, messages, {
                accessToken: channelAccessToken,
              })
            })
          )
          for (const res of results) {
            if (res.status === "fulfilled") sentCount++
            else failedCount++
          }
        }
      }

      totalSent += sentCount
      totalFailed += failedCount
      details.push({
        questionIndex,
        choiceIndex,
        questionLabel: question.label,
        choiceText: choice.text,
        targetCount: recipients.length,
        sentCount,
        failedCount,
      })
    }

    return NextResponse.json({
      sentCount: totalSent,
      failedCount: totalFailed,
      details,
    })
  } catch (error) {
    console.error("Resend rewards error:", error)
    return NextResponse.json(
      { error: "特典の再送に失敗しました" },
      { status: 500 }
    )
  }
}
