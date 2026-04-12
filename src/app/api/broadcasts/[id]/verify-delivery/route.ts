import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/line/client"

export const maxDuration = 300

// 過去の配信について、対象友だちが「今」配信を受け取れる状態かを
// LINE の getProfile API で検証するエンドポイント。
//
// 配信時の実到達は LINE 側に記録が残らないため retroactive に確認する
// 手段はないが、getProfile で 200 が返るユーザーは現時点で bot と友だち
// 関係にある（= 過去配信も高確率で受信できていた）、403/404 が返るユーザー
// はブロック or 友だち解除されており、過去配信の時点で既に受け取れて
// いなかった可能性が高い、という判定材料になる。
//
// 到達不可と判定されたユーザーは friends.status = "blocked" に更新する
// （次回以降の配信対象から自動除外され、「141人送信済み」のような
// 嘘の数字が出る原因を根本から潰す）。
//
// メッセージは一切送信しない。LINE API は getProfile のみ、DB は
// 読み取りと friends.status 更新のみ。
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    // サーバー側の DB 読み書きは admin クライアントで行う（RLS バイパス）。
    // 組織境界は明示的な .eq("organization_id", orgId) で担保。
    const supabase = createAdminClient()

    // LINE 設定取得
    const { data: lineAccount } = await supabase
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

    // 1. 配信レコード取得
    const { data: broadcast, error: bErr } = await supabase
      .from("broadcasts")
      .select("id, target_type, target_filter")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single()

    if (bErr || !broadcast) {
      return NextResponse.json(
        { error: "配信が見つかりません" },
        { status: 404 }
      )
    }

    const targetType = (broadcast as { target_type: string }).target_type
    const targetFilter = (broadcast as {
      target_filter: { tagIds?: string[]; seminarId?: string } | null
    }).target_filter

    // 2. 対象友だち一覧を復元
    let friendQuery = supabase
      .from("friends")
      .select("id, line_user_id, display_name, custom_name")
      .eq("organization_id", orgId)
      .eq("status", "active")

    if (
      targetType === "tag" &&
      targetFilter?.tagIds &&
      Array.isArray(targetFilter.tagIds) &&
      targetFilter.tagIds.length > 0
    ) {
      const { data: taggedFriends } = await supabase
        .from("friend_tags")
        .select("friend_id")
        .in("tag_id", targetFilter.tagIds)
      const friendIds = (taggedFriends || [])
        .map((ft: { friend_id: string | null }) => ft.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        return NextResponse.json({
          totalChecked: 0,
          reachableCount: 0,
          unreachableCount: 0,
          blockedFlippedCount: 0,
          unreachable: [],
        })
      }
    } else if (targetType === "seminar" && targetFilter?.seminarId) {
      const { data: attendances } = await supabase
        .from("attendances")
        .select("friend_id")
        .eq("seminar_id", targetFilter.seminarId)
        .neq("status", "cancelled")
      const friendIds = (attendances || [])
        .map((a: { friend_id: string | null }) => a.friend_id)
        .filter((fid): fid is string => fid !== null)
      if (friendIds.length > 0) {
        friendQuery = friendQuery.in("id", friendIds)
      } else {
        return NextResponse.json({
          totalChecked: 0,
          reachableCount: 0,
          unreachableCount: 0,
          blockedFlippedCount: 0,
          unreachable: [],
        })
      }
    }

    const { data: friendsData } = await friendQuery
    const targetFriends = (friendsData || []) as Array<{
      id: string
      line_user_id: string
      display_name: string | null
      custom_name: string | null
    }>

    if (targetFriends.length === 0) {
      return NextResponse.json({
        totalChecked: 0,
        reachableCount: 0,
        unreachableCount: 0,
        blockedFlippedCount: 0,
        unreachable: [],
      })
    }

    // 3. getProfile を並列で叩いて到達可否を判定
    // concurrency=15 で既存実装と合わせる。LINE API レート制限は
    // fetchWithRetry で自動リトライされる。
    let reachableCount = 0
    const unreachable: Array<{
      id: string
      line_user_id: string
      display_name: string | null
      custom_name: string | null
      reason: string
    }> = []
    const concurrency = 15
    for (let i = 0; i < targetFriends.length; i += concurrency) {
      const batch = targetFriends.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        batch.map((f) =>
          getProfile(f.line_user_id, { accessToken: channelAccessToken })
        )
      )
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          reachableCount += 1
        } else {
          const friend = batch[idx]
          const reason =
            r.reason instanceof Error ? r.reason.message : String(r.reason)
          unreachable.push({
            id: friend.id,
            line_user_id: friend.line_user_id,
            display_name: friend.display_name,
            custom_name: friend.custom_name,
            reason,
          })
        }
      })
    }

    // 4. 到達不可と判定された友だちは status を "blocked" に更新
    // （次回配信の対象から外し、再発防止）
    let blockedFlippedCount = 0
    if (unreachable.length > 0) {
      const unreachableIds = unreachable.map((u) => u.id)
      // 500件ずつ update
      for (let i = 0; i < unreachableIds.length; i += 500) {
        const batch = unreachableIds.slice(i, i + 500)
        const { error } = await supabase
          .from("friends")
          .update({ status: "blocked" })
          .in("id", batch)
          .eq("organization_id", orgId)
          .eq("status", "active") // 既に blocked なら触らない
        if (error) {
          console.error("verify-delivery: status update failed", error)
        } else {
          blockedFlippedCount += batch.length
        }
      }
    }

    return NextResponse.json({
      totalChecked: targetFriends.length,
      reachableCount,
      unreachableCount: unreachable.length,
      blockedFlippedCount,
      unreachable,
    })
  } catch (error) {
    console.error("verify-delivery error:", error)
    return NextResponse.json(
      { error: "到達確認に失敗しました" },
      { status: 500 }
    )
  }
}
