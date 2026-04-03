import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"

interface FollowerIdsResponse {
  userIds: string[]
  next?: string
}

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

// LINE友だち一括同期
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { supabase, orgId } = auth

    const body = await request.json()
    const { lineAccountId } = body

    if (!lineAccountId) {
      return NextResponse.json({ error: "LINEアカウントIDが必要です" }, { status: 400 })
    }

    // LINEアカウント情報を取得
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id, channel_access_token")
      .eq("id", lineAccountId)
      .eq("organization_id", orgId)
      .single()

    if (!lineAccount) {
      return NextResponse.json({ error: "LINEアカウントが見つかりません" }, { status: 404 })
    }

    const token = lineAccount.channel_access_token

    // 1. フォロワーID一覧を取得（ページネーション対応）
    const allUserIds: string[] = []
    let nextToken: string | undefined = undefined

    do {
      const url = new URL("https://api.line.me/v2/bot/followers/ids")
      url.searchParams.set("limit", "1000")
      if (nextToken) url.searchParams.set("start", nextToken)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        return NextResponse.json(
          { error: errData.message || "フォロワー一覧の取得に失敗しました。LINE Developersで「フォロワー一覧の取得」APIが有効か確認してください。" },
          { status: 400 }
        )
      }

      const data: FollowerIdsResponse = await res.json()
      allUserIds.push(...data.userIds)
      nextToken = data.next
    } while (nextToken)

    if (allUserIds.length === 0) {
      return NextResponse.json({ success: true, imported: 0, skipped: 0, message: "フォロワーが見つかりませんでした" })
    }

    // 2. 既存の友だちを取得（重複チェック用）
    const { data: existingFriends } = await supabase
      .from("friends")
      .select("line_user_id")
      .eq("organization_id", orgId)
      .eq("line_account_id", lineAccountId)

    const existingIds = new Set((existingFriends || []).map(f => f.line_user_id))

    // 3. 新規ユーザーのみフィルタ
    const newUserIds = allUserIds.filter(id => !existingIds.has(id))

    if (newUserIds.length === 0) {
      return NextResponse.json({ success: true, imported: 0, skipped: allUserIds.length, message: "全てのフォロワーは既に登録済みです" })
    }

    // 4. プロフィールを取得して友だちとして登録（バッチ処理）
    let imported = 0
    let failed = 0
    const batchSize = 10 // 同時リクエスト数を制限

    for (let i = 0; i < newUserIds.length; i += batchSize) {
      const batch = newUserIds.slice(i, i + batchSize)

      const profiles = await Promise.allSettled(
        batch.map(async (userId) => {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return null
          return (await res.json()) as LineProfile
        })
      )

      const friendsToInsert = profiles
        .filter((r): r is PromiseFulfilledResult<LineProfile | null> => r.status === "fulfilled")
        .map(r => r.value)
        .filter((p): p is LineProfile => p !== null)
        .map(profile => ({
          organization_id: orgId,
          line_account_id: lineAccountId,
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          status_message: profile.statusMessage || null,
          status: "active" as const,
        }))

      if (friendsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("friends")
          .insert(friendsToInsert)

        if (!insertError) {
          imported += friendsToInsert.length
        } else {
          failed += friendsToInsert.length
        }
      }

      failed += profiles.filter(r => r.status === "rejected").length
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: existingIds.size,
      failed,
      total: allUserIds.length,
      message: `${imported}人の友だちをインポートしました`,
    })
  } catch (error) {
    console.error("LINE sync error:", error)
    return NextResponse.json({ error: "友だちの同期に失敗しました" }, { status: 500 })
  }
}
