import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { pushMessage, multicast, broadcast } from "@/lib/line/client"

// 配信履歴一覧
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

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
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 })

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()
    if (!userData) return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 })
    const orgId = userData.organization_id!

    const { title, messageText, targetType, targetFilter, scheduledAt } = await request.json()
    if (!messageText) return NextResponse.json({ error: "メッセージ本文は必須です" }, { status: 400 })

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
        created_by: user.id,
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
      const messages = [{ type: "text" as const, text: messageText }]

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
