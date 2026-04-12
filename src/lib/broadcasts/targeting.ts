import type { SupabaseClient } from "@supabase/supabase-js"

// PostgREST デフォルト上限は 1000 行。タグに紐付く友だちが 1000 人を超えると
// サイレントに切り捨てられるため、.range() を使って明示的にページングする。
const PAGE_SIZE = 1000

export type TargetType = "all" | "tag" | "seminar"
export interface TargetFilter {
  /**
   * 旧実装の OR 条件（互換性のため維持）。
   * 指定したタグの **いずれか** を持つ友だちが対象になる。
   */
  tagIds?: string[]
  /**
   * 新: 含むタグ。指定したタグを **すべて** 持つ友だちだけが対象（AND 条件）。
   * 空配列または省略で無効。
   */
  includeTagIds?: string[]
  /**
   * 新: 除外タグ。指定したタグを **いずれか** 持つ友だちは対象外になる（NOT 条件）。
   * 空配列または省略で無効。
   */
  excludeTagIds?: string[]
  /**
   * セミナー参加者を対象にする場合のセミナー ID。
   */
  seminarId?: string
}

/**
 * 指定したタグに紐付く friend_id を全件取得する（ページネーション対応）。
 * tag_id のいずれかを持つ友だち（OR 条件）を返す。
 */
async function fetchAllFriendIdsForTags(
  admin: SupabaseClient,
  tagIds: string[]
): Promise<string[]> {
  if (tagIds.length === 0) return []
  const all = new Set<string>()
  let from = 0
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
 * target_filter から対象の friend_id セットを計算する。
 *
 * - legacy `tagIds` (OR) / 新 `includeTagIds` (AND) / 新 `excludeTagIds` (NOT) をすべて考慮
 * - 戻り値が null の場合は「全 active 友だちを対象」を意味する（excludeTagIds のみ指定時など）
 * - 戻り値が Set<string> の場合は明示的な友だち ID リスト
 *
 * 合成ルール:
 *   1. includeTagIds は 1 タグずつ別々に集合を取り、**全集合の積集合** を取る（AND）
 *   2. legacy tagIds は OR として 1 つの include 集合にまとめる
 *   3. 上記 1, 2 がともに存在する場合は、その積集合（AND でさらに絞り込み）
 *   4. 最後に excludeTagIds に属する ID を差集合で除去
 *   5. include が 1 つも無く exclude だけ指定されたとき → 「全 active 友だち − excluded」
 */
async function computeTargetFriendIdsForTag(
  admin: SupabaseClient,
  targetFilter: TargetFilter
): Promise<{ ids: Set<string> | null; excluded: Set<string> }> {
  // 1. exclude を最初に計算しておく
  const excluded = new Set<string>()
  if (targetFilter.excludeTagIds && targetFilter.excludeTagIds.length > 0) {
    const ids = await fetchAllFriendIdsForTags(admin, targetFilter.excludeTagIds)
    for (const id of ids) excluded.add(id)
  }

  // 2. include 集合を構築
  // 各タグは独立した集合を作り、最後に全部 intersection で絞り込む。
  // これにより「A と B と C を全て持つ」という AND 条件が成立する。
  const includeSets: Set<string>[] = []

  // legacy tagIds は OR 扱いで 1 つの集合にまとめる
  if (targetFilter.tagIds && targetFilter.tagIds.length > 0) {
    const ids = await fetchAllFriendIdsForTags(admin, targetFilter.tagIds)
    includeSets.push(new Set(ids))
  }

  // includeTagIds は各タグを独立した集合にしてそれぞれ AND 条件に加える
  if (targetFilter.includeTagIds && targetFilter.includeTagIds.length > 0) {
    for (const tagId of targetFilter.includeTagIds) {
      const ids = await fetchAllFriendIdsForTags(admin, [tagId])
      includeSets.push(new Set(ids))
    }
  }

  // 3. include が無ければ、exclude のみモード（null を返して上位に「全員対象」を伝える）
  if (includeSets.length === 0) {
    return { ids: null, excluded }
  }

  // 4. include 集合の積集合（AND）
  let intersection = includeSets[0]
  for (let i = 1; i < includeSets.length; i++) {
    const next = new Set<string>()
    for (const id of intersection) {
      if (includeSets[i].has(id)) next.add(id)
    }
    intersection = next
    if (intersection.size === 0) break
  }

  // 5. exclude を差集合で除去
  if (excluded.size > 0) {
    const filtered = new Set<string>()
    for (const id of intersection) {
      if (!excluded.has(id)) filtered.add(id)
    }
    intersection = filtered
  }

  return { ids: intersection, excluded }
}

/**
 * 配信の対象となる友だち一覧を確実に全件取得する。
 *
 * - タグ指定 / セミナー / 全員 に対応
 * - include (AND) / exclude (NOT) / legacy tagIds (OR) のすべてをサポート
 * - 友だちID の事前リストと friends テーブルの両方で 1000 行上限を回避
 * - friend_id の重複排除済み
 */
export async function fetchTargetFriendsForBroadcast(
  admin: SupabaseClient,
  orgId: string,
  targetType: TargetType,
  targetFilter: TargetFilter | null,
  options: FetchTargetOptions = {}
): Promise<FetchedFriend[]> {
  const statusFilter = options.statusFilter === undefined ? "active" : options.statusFilter

  // 計算結果:
  //   friendIdFilter: 事前に絞り込まれた対象 friend_id のリスト（null = 全員対象）
  //   excludedSet: 除外すべき friend_id のセット（friendIdFilter=null のときに friends 取得後に JS 側で除外）
  let friendIdFilter: string[] | null = null
  let excludedSet = new Set<string>()

  if (targetType === "tag" && targetFilter) {
    const { ids, excluded } = await computeTargetFriendIdsForTag(admin, targetFilter)
    excludedSet = excluded
    if (ids !== null) {
      friendIdFilter = Array.from(ids)
      if (friendIdFilter.length === 0) return []
    }
    // ids === null は「include 条件なし、exclude のみ」または「include も exclude も空」
    // どちらにしても friendIdFilter は null のままで後段の「全員から exclude を引く」経路へ
  } else if (targetType === "seminar" && targetFilter?.seminarId) {
    friendIdFilter = await fetchAllFriendIdsForSeminar(admin, targetFilter.seminarId)
    if (friendIdFilter.length === 0) return []
  }

  // friends 本体をページングで全件取得
  const result = new Map<string, FetchedFriend>()

  if (friendIdFilter !== null) {
    // 明示的な ID リストに対して 500 件ずつバッチで取得
    const BATCH_SIZE = 500
    for (let i = 0; i < friendIdFilter.length; i += BATCH_SIZE) {
      const idBatch = friendIdFilter.slice(i, i + BATCH_SIZE)
      let from = 0
      for (let page = 0; page < 100; page++) {
        const to = from + PAGE_SIZE - 1
        let q = admin
          .from("friends")
          .select("id, line_user_id, display_name, custom_name, picture_url, status")
          .eq("organization_id", orgId)
          .in("id", idBatch)
        if (statusFilter) {
          q = q.eq("status", statusFilter)
        }
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
    // friendIdFilter === null: 全 active 友だちをページングで取得し、JS 側で excluded を差集合
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
        if (row.id && !result.has(row.id) && !excludedSet.has(row.id)) {
          result.set(row.id, row)
        }
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
