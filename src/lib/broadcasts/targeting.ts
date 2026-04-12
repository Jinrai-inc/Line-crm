import type { SupabaseClient } from "@supabase/supabase-js"

// PostgREST デフォルト上限は 1000 行。タグに紐付く友だちが 1000 人を超えると
// サイレントに切り捨てられるため、.range() を使って明示的にページングする。
const PAGE_SIZE = 1000

export type TargetType = "all" | "tag" | "seminar"
export interface TargetFilter {
  tagIds?: string[]
  seminarId?: string
}

/**
 * 指定したタグに紐付く friend_id を全件取得する（ページネーション対応）。
 * Supabase のデフォルト行数制限 1000 を回避するため、.range() で明示的に
 * ページングし、結果を重複排除して返す。
 */
async function fetchAllFriendIdsForTags(
  admin: SupabaseClient,
  tagIds: string[]
): Promise<string[]> {
  if (tagIds.length === 0) return []
  const all = new Set<string>()
  let from = 0
  // 安全のため最大 500 ページ (= 500,000 行) までに制限
  for (let page = 0; page < 500; page++) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await admin
      .from("friend_tags")
      .select("friend_id")
      .in("tag_id", tagIds)
      .range(from, to)
    if (error) {
      console.error("fetchAllFriendIdsForTags: query failed", error)
      break
    }
    const rows = (data || []) as Array<{ friend_id: string | null }>
    for (const row of rows) {
      if (row.friend_id) all.add(row.friend_id)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return Array.from(all)
}

/**
 * 指定したセミナーの attendances から friend_id を全件取得する（ページネーション対応）。
 */
async function fetchAllFriendIdsForSeminar(
  admin: SupabaseClient,
  seminarId: string
): Promise<string[]> {
  const all = new Set<string>()
  let from = 0
  for (let page = 0; page < 500; page++) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await admin
      .from("attendances")
      .select("friend_id")
      .eq("seminar_id", seminarId)
      .neq("status", "cancelled")
      .range(from, to)
    if (error) {
      console.error("fetchAllFriendIdsForSeminar: query failed", error)
      break
    }
    const rows = (data || []) as Array<{ friend_id: string | null }>
    for (const row of rows) {
      if (row.friend_id) all.add(row.friend_id)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return Array.from(all)
}

export interface FetchedFriend {
  id: string
  line_user_id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
  status: string
}

export interface FetchTargetOptions {
  /** status で絞り込むかどうか。デフォルト "active" のみ。null なら絞り込みなし。 */
  statusFilter?: "active" | null
}

/**
 * 配信の対象となる友だち一覧を確実に全件取得する。
 *
 * - タグ指定 / セミナー / 全員 に対応
 * - 友だちID の事前リストと friends テーブルの両方で 1000 行上限を回避
 * - friend_id の重複排除済み
 *
 * 戻り値の配列は常に「組織内の重複なしの友だちレコード」。
 */
export async function fetchTargetFriendsForBroadcast(
  admin: SupabaseClient,
  orgId: string,
  targetType: TargetType,
  targetFilter: TargetFilter | null,
  options: FetchTargetOptions = {}
): Promise<FetchedFriend[]> {
  const statusFilter = options.statusFilter === undefined ? "active" : options.statusFilter

  // タグ/セミナーの場合は先に対象となる friend_id を取得
  let friendIdFilter: string[] | null = null

  if (
    targetType === "tag" &&
    targetFilter?.tagIds &&
    Array.isArray(targetFilter.tagIds) &&
    targetFilter.tagIds.length > 0
  ) {
    friendIdFilter = await fetchAllFriendIdsForTags(admin, targetFilter.tagIds)
    if (friendIdFilter.length === 0) return []
  } else if (targetType === "seminar" && targetFilter?.seminarId) {
    friendIdFilter = await fetchAllFriendIdsForSeminar(admin, targetFilter.seminarId)
    if (friendIdFilter.length === 0) return []
  }

  // friends 本体をページングで全件取得
  // .in("id", friendIdFilter) は PostgREST のクエリ長制限もあるため、
  // friendIdFilter 自体を 1000 件ずつバッチ化して .in に渡す必要がある。
  const result = new Map<string, FetchedFriend>()

  if (friendIdFilter) {
    // friendIdFilter を 1000 件ずつバッチ化して取得
    const BATCH_SIZE = 500 // URL/クエリ長を抑えるため控えめ
    for (let i = 0; i < friendIdFilter.length; i += BATCH_SIZE) {
      const idBatch = friendIdFilter.slice(i, i + BATCH_SIZE)
      let q = admin
        .from("friends")
        .select("id, line_user_id, display_name, custom_name, picture_url, status")
        .eq("organization_id", orgId)
        .in("id", idBatch)
      if (statusFilter) {
        q = q.eq("status", statusFilter)
      }
      // ここでも内部的な 1000 行上限に当たらないよう明示的に range
      let from = 0
      for (let page = 0; page < 100; page++) {
        const to = from + PAGE_SIZE - 1
        const { data, error } = await q.range(from, to)
        if (error) {
          console.error("fetchTargetFriendsForBroadcast: friends page query failed", error)
          break
        }
        const rows = (data || []) as FetchedFriend[]
        for (const row of rows) {
          if (row.id && !result.has(row.id)) result.set(row.id, row)
        }
        if (rows.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
    }
  } else {
    // "all" ターゲット: 組織内の active 友だちを全件ページングで取得
    let from = 0
    for (let page = 0; page < 500; page++) {
      const to = from + PAGE_SIZE - 1
      let q = admin
        .from("friends")
        .select("id, line_user_id, display_name, custom_name, picture_url, status")
        .eq("organization_id", orgId)
      if (statusFilter) {
        q = q.eq("status", statusFilter)
      }
      const { data, error } = await q.range(from, to)
      if (error) {
        console.error("fetchTargetFriendsForBroadcast: all-friends page query failed", error)
        break
      }
      const rows = (data || []) as FetchedFriend[]
      for (const row of rows) {
        if (row.id && !result.has(row.id)) result.set(row.id, row)
      }
      if (rows.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }

  return Array.from(result.values())
}

/**
 * 配信の message_logs にこの配信 ID で記録されているエントリを全件取得する
 * （raw_event.broadcast_id で絞り込み）。1000 行上限を回避するため
 * .range() でページング。
 */
export async function fetchDeliveryLogsForBroadcast(
  admin: SupabaseClient,
  orgId: string,
  broadcastId: string
): Promise<
  Array<{
    friend_id: string | null
    line_user_id: string | null
    created_at: string | null
  }>
> {
  const result: Array<{
    friend_id: string | null
    line_user_id: string | null
    created_at: string | null
  }> = []
  let from = 0
  for (let page = 0; page < 500; page++) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await (admin
      .from("message_logs")
      .select("friend_id, line_user_id, created_at")
      .eq("organization_id", orgId)
      .eq("event_type", "message_send")
      .filter("raw_event->>broadcast_id" as never, "eq", broadcastId)
      .range(from, to) as unknown as Promise<{
      data: Array<{
        friend_id: string | null
        line_user_id: string | null
        created_at: string | null
      }> | null
      error: unknown
    }>)
    if (error) {
      console.error("fetchDeliveryLogsForBroadcast: query failed", error)
      break
    }
    const rows = data || []
    for (const row of rows) {
      result.push(row)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return result
}
