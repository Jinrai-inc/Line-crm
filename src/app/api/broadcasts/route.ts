import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { pushMessage, broadcast } from "@/lib/line/client"
import { createFileDeliveryMessage } from "@/lib/line/flex-templates"

function replaceNameTag(text: string, displayName: string): string {
  return text.replace(/\{name\}/g, displayName).replace(/\{名前\}/g, displayName)
}

function messageContainsNameTag(messages: unknown[]): boolean {
  return messages.some((m) => {
    const msg = m as { type?: string; text?: string }
    return msg.type === "text" && msg.text && (/\{name\}/.test(msg.text) || /\{名前\}/.test(msg.text))
  })
}

// 配信メッセージの履歴用要約テキスト（個別メッセージ履歴に表示される）
function buildLogContent(
  messageText: string | undefined,
  messageType: string | undefined,
  fileName: string | undefined
): string {
  if (messageType === "image") return messageText || "[画像]"
  if (messageType === "video") return messageText || "[動画]"
  if (messageType === "pdf") return messageText || `[PDF] ${fileName || ""}`.trim()
  return messageText || "[配信メッセージ]"
}

// 配信送信後に個別メッセージ履歴（message_logs）にまとめて記録する
// event_type="message_send" は友だち詳細画面で「送信済み」として扱われるため、
// これを入れないと配信が個別履歴に一切表示されない。
// raw_event に broadcast_id を入れておくことで、後から配信別の到達状況を
// 集計できるようにする（/broadcasts/[id] 詳細画面などで使用）。
async function logBroadcastDelivery(
  supabase: SupabaseClient,
  orgId: string,
  broadcastId: string | null,
  friends: Array<{ id: string | null; line_user_id: string }>,
  content: string,
  messageType: string
): Promise<void> {
  if (friends.length === 0) return
  const rows = friends.map((f) => ({
    organization_id: orgId,
    friend_id: f.id,
    line_user_id: f.line_user_id,
    event_type: "message_send",
    message_type: messageType,
    content,
    raw_event: broadcastId ? { broadcast_id: broadcastId } : null,
  }))
  try {
    // 大量件数にも耐えられるよう 500 件ずつ insert
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase.from("message_logs").insert(batch)
      if (error) {
        console.error("logBroadcastDelivery: insert failed", error)
      }
    }
  } catch (err) {
    console.error("logBroadcastDelivery threw", err)
  }
}

export const maxDuration = 300

// 配信履歴一覧
export async function GET() {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const { data: broadcasts, error } = await supabase
      .from("broadcasts")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: broadcasts || [] })
  } catch (error) {
    console.error("Broadcasts GET error:", error)
    return NextResponse.json({ error: "配信履歴の取得に失敗しました" }, { status: 500 })
  }
}

// 配信作成・送信
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId, userId } = auth

    const { title, messageText, messageType, imageUrl, previewImageUrl, fileName, targetType, targetFilter, scheduledAt } = await request.json()
    if (messageType === "image" || messageType === "video") {
      if (!imageUrl) return NextResponse.json({ error: "ファイルURLは必須です" }, { status: 400 })
    } else if (messageType === "pdf") {
      if (!imageUrl) return NextResponse.json({ error: "PDFファイルURLは必須です" }, { status: 400 })
    } else {
      if (!messageText && !imageUrl) return NextResponse.json({ error: "メッセージ本文またはファイルが必須です" }, { status: 400 })
    }

    // LINE設定取得
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id, channel_access_token")
      .eq("organization_id", orgId)
      .single()

    if (!lineAccount) {
      return NextResponse.json({ error: "LINE設定が見つかりません。先にLINE連携を設定してください。" }, { status: 404 })
    }

    // 配信レコード作成
    const { data: broadcastRecord, error: insertError } = await supabase
      .from("broadcasts")
      .insert({
        organization_id: orgId,
        line_account_id: lineAccount.id,
        title,
        message_text: messageText,
        target_type: targetType || "all",
        target_filter: targetFilter || null,
        status: scheduledAt ? "draft" : "sending",
        scheduled_at: scheduledAt || null,
        created_by: userId,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 予約配信の場合はここで終了
    if (scheduledAt) {
      return NextResponse.json({ data: broadcastRecord, message: "配信を予約しました" }, { status: 201 })
    }

    // 即時送信
    try {
      let sentCount = 0
      let failedCount = 0
      const messages: unknown[] = []

      if (messageType === "pdf") {
        // PDFはFlex Messageで配信（LINEはPDF直接送信非対応）
        messages.push(createFileDeliveryMessage(
          title || "ファイルのお届け",
          messageText || "",
          imageUrl,
          fileName || imageUrl.split("/").pop() || "document.pdf"
        ))
      } else {
        if (messageType === "image") {
          messages.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: previewImageUrl || imageUrl })
        } else if (messageType === "video") {
          messages.push({ type: "video", originalContentUrl: imageUrl, previewImageUrl: previewImageUrl || imageUrl })
        } else if (imageUrl) {
          // テキスト配信にファイルが添付されている場合
          const isPdf = imageUrl.toLowerCase().endsWith(".pdf") || fileName?.toLowerCase().endsWith(".pdf")
          if (isPdf) {
            messages.push(createFileDeliveryMessage(
              title || "ファイルのお届け",
              "",
              imageUrl,
              fileName || imageUrl.split("/").pop() || "document.pdf"
            ))
          } else {
            messages.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl })
          }
        }

        if (messageText && messageType !== "pdf") {
          messages.push({ type: "text", text: messageText })
        }
      }

      if (messages.length === 0) {
        return NextResponse.json({ error: "送信するメッセージがありません" }, { status: 400 })
      }

      const hasNameTag = messageContainsNameTag(messages)
      const logContent = buildLogContent(messageText, messageType, fileName)
      const logMessageType = messageType || "text"

      if (targetType === "all" && !hasNameTag) {
        // 全員配信（名前タグなし）— LINE の broadcast API を使用
        // 個別追跡はできないが、個別メッセージ履歴に反映させるため active 友だち
        // 全員へ message_logs を楽観的に記録する。
        await broadcast(messages, { accessToken: lineAccount.channel_access_token })

        const { data: allActive } = await supabase
          .from("friends")
          .select("id, line_user_id")
          .eq("organization_id", orgId)
          .eq("status", "active")

        const activeFriends = (allActive || []) as Array<{ id: string; line_user_id: string }>
        sentCount = activeFriends.length
        await logBroadcastDelivery(
          supabase,
          orgId,
          broadcastRecord.id as string,
          activeFriends,
          logContent,
          logMessageType
        )
      } else {
        // タグ指定 / セミナー参加者 / 全員（パーソナライズあり）の配信は
        // 全て個別 pushMessage で送信する。
        //
        // 以前は multicast で500件ずつ送っていたが、LINE の multicast は HTTP 200
        // を返しても実配信に失敗するユーザーが含まれていても判別できず、
        // 「141人に送信済み」と表示されても実際には十数名にしか届いていない
        // という事象が発生していた。個別 push なら Promise.allSettled で
        // ユーザー単位の成功/失敗を把握できる。
        let friendQuery = supabase
          .from("friends")
          .select("id, line_user_id, display_name, custom_name")
          .eq("organization_id", orgId)
          .eq("status", "active")

        if (targetType === "tag" && targetFilter?.tagIds && Array.isArray(targetFilter.tagIds) && targetFilter.tagIds.length > 0) {
          const { data: taggedFriends } = await supabase
            .from("friend_tags")
            .select("friend_id")
            .in("tag_id", targetFilter.tagIds)
          const friendIds = (taggedFriends || [])
            .map((ft: { friend_id: string | null }) => ft.friend_id)
            .filter((id): id is string => id !== null)
          if (friendIds.length > 0) {
            friendQuery = friendQuery.in("id", friendIds)
          } else {
            friendQuery = friendQuery.eq("id", "00000000-0000-0000-0000-000000000000")
          }
        } else if (targetType === "seminar" && targetFilter?.seminarId) {
          const { data: attendances } = await supabase
            .from("attendances")
            .select("friend_id")
            .eq("seminar_id", targetFilter.seminarId)
            .neq("status", "cancelled")
          const friendIds = (attendances || [])
            .map((a: { friend_id: string | null }) => a.friend_id)
            .filter((id): id is string => id !== null)
          if (friendIds.length > 0) {
            friendQuery = friendQuery.in("id", friendIds)
          } else {
            friendQuery = friendQuery.eq("id", "00000000-0000-0000-0000-000000000000")
          }
        }
        // targetType==="all" && hasNameTag の場合は絞り込みなし（全 active 友だち）

        const { data: targetFriends } = await friendQuery
        const friends = (targetFriends || []) as Array<{
          id: string
          line_user_id: string
          display_name: string | null
          custom_name: string | null
        }>

        // 成功したユーザーだけを追跡して、最後に message_logs へまとめて挿入する
        const successfulFriends: Array<{ id: string; line_user_id: string }> = []

        // 15 件並列 × 逐次バッチで送信（fetchWithRetry で 429/5xx は自動リトライ済）
        const concurrency = 15
        for (let i = 0; i < friends.length; i += concurrency) {
          const batch = friends.slice(i, i + concurrency)
          const results = await Promise.allSettled(
            batch.map((f) => {
              const name = f.custom_name || f.display_name || "お客様"
              const personalizedMessages = hasNameTag
                ? messages.map((m) => {
                  const msg = m as { type?: string; text?: string }
                  if (msg.type === "text" && msg.text) {
                    return { ...msg, text: replaceNameTag(msg.text, name) }
                  }
                  return m
                })
                : messages
              return pushMessage(f.line_user_id, personalizedMessages, {
                accessToken: lineAccount.channel_access_token,
              })
            })
          )
          results.forEach((r, idx) => {
            if (r.status === "fulfilled") {
              sentCount += 1
              successfulFriends.push({
                id: batch[idx].id,
                line_user_id: batch[idx].line_user_id,
              })
            } else {
              failedCount += 1
              console.error(
                `Broadcast push failed for ${batch[idx].line_user_id}:`,
                r.reason
              )
            }
          })
        }

        // 成功したユーザー分だけ message_logs にまとめて記録
        await logBroadcastDelivery(
          supabase,
          orgId,
          broadcastRecord.id as string,
          successfulFriends,
          logContent,
          logMessageType
        )
      }

      // 配信結果を更新
      await supabase
        .from("broadcasts")
        .update({
          status: "sent",
          sent_count: sentCount,
          failed_count: failedCount,
          sent_at: new Date().toISOString(),
        })
        .eq("id", broadcastRecord.id)

      return NextResponse.json({
        data: { ...broadcastRecord, status: "sent", sent_count: sentCount, failed_count: failedCount },
        message: `${sentCount}件に配信しました`,
      }, { status: 201 })
    } catch (sendError) {
      // 送信失敗時
      await supabase
        .from("broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcastRecord.id)

      console.error("Broadcast send error:", sendError)
      return NextResponse.json({ error: "配信の送信に失敗しました" }, { status: 500 })
    }
  } catch (error) {
    console.error("Broadcast POST error:", error)
    return NextResponse.json({ error: "配信の作成に失敗しました" }, { status: 500 })
  }
}
