import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { pushMessage, multicast, broadcast } from "@/lib/line/client"
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

      // タグ/セミナー指定の対象友だちを解決する。
      // 以前は friend_tags / attendances から friend_id を取得してから
      // friends を .in("id", friendIds) で再クエリしていたが、対象が数百件を
      // 超えるとクエリ文字列が PostgREST の URL 長制限（~8KB）を超えて
      // 414/エラーとなり、サイレントに送信0件・エラー表示となっていた。
      // さらに taggedFriends が空/エラー時はフィルタが適用されず、意図せず
      // 全員配信に fall-through する欠陥があった。
      // 単一クエリの inner join に置き換え、URL にはタグIDやセミナーIDのみ
      // 乗せることで URL 長問題を回避し、エラーも明示的に伝播させる。
      // また PostgREST の暗黙的な上限（~1000件）で大量送信時に対象が黙殺
      // されないよう、1000件ずつ明示ページングで全件取得する。
      type TargetFriend = {
        line_user_id: string
        display_name: string | null
        custom_name: string | null
      }
      const PAGE_SIZE = 1000
      let targetFriends: TargetFriend[] | null = null

      if (targetType === "tag") {
        if (!Array.isArray(targetFilter?.tagIds) || targetFilter.tagIds.length === 0) {
          return NextResponse.json({ error: "タグを選択してください" }, { status: 400 })
        }
        targetFriends = []
        const seen = new Set<string>()
        for (let page = 0; ; page++) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1
          const { data, error: tagErr } = await supabase
            .from("friends")
            .select("id, line_user_id, display_name, custom_name, friend_tags!inner(tag_id)")
            .eq("organization_id", orgId)
            .eq("status", "active")
            .in("friend_tags.tag_id", targetFilter.tagIds)
            .order("id", { ascending: true })
            .range(from, to)
          if (tagErr) throw tagErr
          const rows = (data || []) as Array<TargetFriend & { id: string; friend_tags?: unknown }>
          for (const row of rows) {
            if (!row.line_user_id || seen.has(row.line_user_id)) continue
            seen.add(row.line_user_id)
            targetFriends.push({
              line_user_id: row.line_user_id,
              display_name: row.display_name,
              custom_name: row.custom_name,
            })
          }
          if (rows.length < PAGE_SIZE) break
        }
      } else if (targetType === "seminar") {
        if (!targetFilter?.seminarId) {
          return NextResponse.json({ error: "セミナーを選択してください" }, { status: 400 })
        }
        targetFriends = []
        const seen = new Set<string>()
        for (let page = 0; ; page++) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1
          const { data, error: semErr } = await supabase
            .from("friends")
            .select("id, line_user_id, display_name, custom_name, attendances!inner(seminar_id, status)")
            .eq("organization_id", orgId)
            .eq("status", "active")
            .eq("attendances.seminar_id", targetFilter.seminarId)
            .neq("attendances.status", "cancelled")
            .order("id", { ascending: true })
            .range(from, to)
          if (semErr) throw semErr
          const rows = (data || []) as Array<TargetFriend & { id: string; attendances?: unknown }>
          for (const row of rows) {
            if (!row.line_user_id || seen.has(row.line_user_id)) continue
            seen.add(row.line_user_id)
            targetFriends.push({
              line_user_id: row.line_user_id,
              display_name: row.display_name,
              custom_name: row.custom_name,
            })
          }
          if (rows.length < PAGE_SIZE) break
        }
      }

      if (hasNameTag) {
        // {name}タグがある場合は個別送信でパーソナライズ
        let personalizeFriends: TargetFriend[]
        if (targetFriends === null) {
          // targetType === "all": 全アクティブ友だちをページングで取得
          personalizeFriends = []
          for (let page = 0; ; page++) {
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1
            const { data, error: allErr } = await supabase
              .from("friends")
              .select("line_user_id, display_name, custom_name")
              .eq("organization_id", orgId)
              .eq("status", "active")
              .order("id", { ascending: true })
              .range(from, to)
            if (allErr) throw allErr
            const rows = (data || []) as TargetFriend[]
            personalizeFriends.push(...rows)
            if (rows.length < PAGE_SIZE) break
          }
        } else {
          personalizeFriends = targetFriends
        }

        if (personalizeFriends.length > 0) {
          // 並列度30で個別送信。LINE push は 2000 req/sec 程度まで許容されるため
          // 30並列でも十分安全。旧実装（10並列）では maxDuration=300s の間に
          // 約1万件で頭打ちになっていたが、3倍程度まで拡張可能。
          const PERSONALIZE_CONCURRENCY = 30
          for (let i = 0; i < personalizeFriends.length; i += PERSONALIZE_CONCURRENCY) {
            const batch = personalizeFriends.slice(i, i + PERSONALIZE_CONCURRENCY)
            const results = await Promise.allSettled(
              batch.map((f) => {
                const name = f.custom_name || f.display_name || "お客様"
                const personalizedMessages = messages.map((m) => {
                  const msg = m as { type?: string; text?: string }
                  if (msg.type === "text" && msg.text) {
                    return { ...msg, text: replaceNameTag(msg.text, name) }
                  }
                  return m
                })
                return pushMessage(f.line_user_id, personalizedMessages, { accessToken: lineAccount.channel_access_token })
              })
            )
            sentCount += results.filter(r => r.status === "fulfilled").length
            failedCount += results.filter(r => r.status === "rejected").length
          }
        }
      } else if (targetFriends === null) {
        // 全員配信（名前タグなし）
        await broadcast(messages, { accessToken: lineAccount.channel_access_token })
        const { count } = await supabase
          .from("friends")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "active")
        sentCount = count || 0
      } else if (targetFriends.length > 0) {
        // ターゲット配信（名前タグなし）
        // 500件単位のマルチキャストバッチを 5 並列で送信。10万件規模でも
        // 概ね10秒前後で捌けるため maxDuration=300s の範囲で完結する。
        const userIds = targetFriends.map((f) => f.line_user_id)
        const BATCH_SIZE = 500
        const MULTICAST_CONCURRENCY = 5
        const batches: string[][] = []
        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
          batches.push(userIds.slice(i, i + BATCH_SIZE))
        }
        for (let i = 0; i < batches.length; i += MULTICAST_CONCURRENCY) {
          const group = batches.slice(i, i + MULTICAST_CONCURRENCY)
          const results = await Promise.allSettled(
            group.map((batch) => multicast(batch, messages, { accessToken: lineAccount.channel_access_token }))
          )
          results.forEach((r, idx) => {
            const size = group[idx].length
            if (r.status === "fulfilled") sentCount += size
            else failedCount += size
          })
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
