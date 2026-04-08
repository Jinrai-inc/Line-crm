import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { pushMessage, multicast, broadcast } from "@/lib/line/client"
import { createFileDeliveryMessage } from "@/lib/line/flex-templates"

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

      if (targetType === "all") {
        // 全員配信
        await broadcast(messages, { accessToken: lineAccount.channel_access_token })
        // 概算数を取得
        const { count } = await supabase
          .from("friends")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "active")
        sentCount = count || 0
      } else {
        // ターゲット配信（タグ等）
        let friendQuery = supabase
          .from("friends")
          .select("line_user_id")
          .eq("organization_id", orgId)
          .eq("status", "active")

        if (targetType === "tag" && targetFilter?.tagIds) {
          const { data: taggedFriends } = await supabase
            .from("friend_tags")
            .select("friend_id")
            .in("tag_id", targetFilter.tagIds)

          if (taggedFriends && taggedFriends.length > 0) {
            const friendIds = taggedFriends.map((ft: { friend_id: string | null }) => ft.friend_id).filter((id): id is string => id !== null)
            friendQuery = friendQuery.in("id", friendIds)
          }
        } else if (targetType === "seminar" && targetFilter?.seminarId) {
          // セミナー参加者に絞り込み
          const { data: attendances } = await supabase
            .from("attendances")
            .select("friend_id")
            .eq("seminar_id", targetFilter.seminarId)
            .neq("status", "cancelled")

          if (attendances && attendances.length > 0) {
            const friendIds = attendances.map((a: { friend_id: string | null }) => a.friend_id).filter((id): id is string => id !== null)
            friendQuery = friendQuery.in("id", friendIds)
          } else {
            // 参加者なし
            friendQuery = friendQuery.eq("id", "00000000-0000-0000-0000-000000000000")
          }
        }

        const { data: targetFriends } = await friendQuery

        if (targetFriends && targetFriends.length > 0) {
          const userIds = targetFriends.map((f: { line_user_id: string }) => f.line_user_id)

          // 500件ずつバッチ送信
          for (let i = 0; i < userIds.length; i += 500) {
            const batch = userIds.slice(i, i + 500)
            try {
              await multicast(batch, messages, { accessToken: lineAccount.channel_access_token })
              sentCount += batch.length
            } catch {
              failedCount += batch.length
            }
          }
        }
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
