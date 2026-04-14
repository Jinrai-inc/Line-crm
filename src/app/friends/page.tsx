"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatDateShort, formatRelativeTime } from "@/lib/utils/date"
import {
  SearchIcon,
  PlusIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  TagIcon,
  MessageSquareIcon,
  UserIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  UsersIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface Tag {
  id: string
  name: string
  color: string
}

interface Friend {
  id: string
  line_user_id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
  status: "active" | "blocked" | "unfollowed"
  tags: Tag[]
  first_added_at: string
  last_message_at: string | null
  friend_tags?: { tag_id: string; tags: Tag }[]
}

interface FriendsResponse {
  data: Friend[]
  total: number
  page: number
  limit: number
}

type SortField = "display_name" | "first_added_at" | "last_message_at"
type SortDirection = "asc" | "desc"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  active: { label: "アクティブ", variant: "default" },
  blocked: { label: "ブロック", variant: "destructive" },
  unfollowed: { label: "フォロー解除", variant: "secondary" },
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const

// ── Main Page Component ────────────────────────────────────────────────

export default function FriendsPage() {
  const accentColor = useAccentColor()
  // Local state
  const [friends, setFriends] = useState<Friend[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("first_added_at")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [unreadFriendIds, setUnreadFriendIds] = useState<Set<string>>(new Set())

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState({ display_name: "", custom_name: "" })
  const [addLoading, setAddLoading] = useState(false)

  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false)
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([])
  const [bulkTagSaving, setBulkTagSaving] = useState(false)

  // LINE friend sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null)

  // ── Fetch friends ──────────────────────────────────────────────────

  const fetchFriends = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: sortField,
        sortOrder: sortDir,
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (selectedTagIds.length > 0) params.set("tagIds", selectedTagIds.join(","))

      const res = await fetch(`/api/friends?${params}`)
      if (!res.ok) throw new Error("Fetch failed")
      const json = await res.json()
      // friend_tags のネスト構造を tags 配列にマッピング
      const mapped = (json.data || []).map((f: Record<string, unknown>) => ({
        ...f,
        tags: ((f.friend_tags as Array<{ tags: Tag }>) || [])
          .map((ft) => ft.tags)
          .filter(Boolean),
      }))
      setFriends(mapped)
      setTotal(json.total)
    } catch {
      // silently handle – could add toast later
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, selectedTagIds, sortField, sortDir])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  // Fetch all available tags for filters
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((json) => setAllTags(json.data ?? []))
      .catch(() => {})
  }, [])

  // 未読状態を取得
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/unread")
      if (res.ok) {
        const json = await res.json()
        setUnreadFriendIds(new Set(json.unreadFriendIds || []))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  // ── Helpers ────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value, 10))
    setPage(1)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === friends.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(friends.map((f) => f.id)))
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
    setPage(1)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // LINE 友だち一括同期（フォロワー一覧 API でフル取得）
  const handleSyncFriends = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      // 組織の有効な LINE アカウント一覧を取得
      const accountsRes = await fetch("/api/settings/line")
      if (!accountsRes.ok) {
        setSyncResult({ type: "error", message: "LINE設定の取得に失敗しました" })
        return
      }
      const accountsJson = await accountsRes.json()
      const accounts: Array<{ id: string; channel_name: string; webhook_active?: boolean }> =
        accountsJson.lineAccounts || []
      const activeAccounts = accounts.filter((a) => a.webhook_active !== false)

      if (activeAccounts.length === 0) {
        setSyncResult({
          type: "error",
          message:
            "有効なLINEアカウントがありません。設定 → LINE連携 から連携してください。",
        })
        return
      }

      // 各アカウントを順次同期
      let totalImported = 0
      const messages: string[] = []
      let anyFailed = false

      for (const account of activeAccounts) {
        const res = await fetch("/api/settings/line/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineAccountId: account.id }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          totalImported += data.imported || 0
          messages.push(
            `[${account.channel_name}] ${data.imported}人追加 / ${data.skipped}人スキップ`
          )
        } else {
          anyFailed = true
          messages.push(`[${account.channel_name}] ${data.error || "同期に失敗しました"}`)
        }
      }

      if (anyFailed && totalImported === 0) {
        setSyncResult({ type: "error", message: messages.join("\n") })
      } else {
        setSyncResult({
          type: "success",
          message:
            totalImported > 0
              ? `${totalImported}人の友だちを新規インポートしました\n${messages.join("\n")}`
              : `新しい友だちはいませんでした\n${messages.join("\n")}`,
        })
        // リストを再取得して反映
        await fetchFriends()
      }
    } catch {
      setSyncResult({ type: "error", message: "同期処理中にエラーが発生しました" })
    } finally {
      setSyncing(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
    setPage(1)
  }

  // ── Actions ────────────────────────────────────────────────────────

  const handleExportCsv = async () => {
    const params = new URLSearchParams()
    if (selectedIds.size > 0) {
      params.set("ids", Array.from(selectedIds).join(","))
    }
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (search) params.set("search", search)

    const res = await fetch(`/api/friends/export?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "friends.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddFriend = async () => {
    if (!addForm.display_name.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ display_name: "", custom_name: "" })
        fetchFriends()
      }
    } finally {
      setAddLoading(false)
    }
  }

  const handleBulkTagAssign = async () => {
    if (bulkTagIds.length === 0 || selectedIds.size === 0) return
    setBulkTagSaving(true)
    try {
      const friendIds = Array.from(selectedIds)
      const requests: Promise<Response>[] = []
      for (const friendId of friendIds) {
        for (const tagId of bulkTagIds) {
          requests.push(
            fetch(`/api/friends/${friendId}/tags`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tagId }),
            })
          )
        }
      }
      await Promise.all(requests)
      setBulkTagDialogOpen(false)
      setBulkTagIds([])
      setSelectedIds(new Set())
      fetchFriends()
    } catch {
      // handle error
    } finally {
      setBulkTagSaving(false)
    }
  }

  const toggleBulkTag = (tagId: string) => {
    setBulkTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const selectAllOnPage = () => {
    setSelectedIds(new Set(friends.map((f) => f.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // ── Render ─────────────────────────────────────────────────────────

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDownIcon className="size-3.5" />
    </button>
  )

  return (
    <AppLayout>
      <PageHeader
        title="友だち一覧"
        description="LINE友だちの管理・検索"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFriends}
              disabled={syncing}
              title="LINE側に登録されているフォロワー全員をCRMに取り込みます"
            >
              {syncing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              {syncing ? "同期中..." : "友だち同期"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <DownloadIcon />
              CSVエクスポート
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
                  <PlusIcon />
                  友だち追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>友だちを手動追加</DialogTitle>
                  <DialogDescription>
                    LINE表示名を入力して友だちを手動で追加します。
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="add-line-name">LINE表示名 *</Label>
                    <Input
                      id="add-line-name"
                      value={addForm.display_name}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, display_name: e.target.value }))
                      }
                      placeholder="LINE表示名を入力"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="add-display-name">表示名（カスタム）</Label>
                    <Input
                      id="add-display-name"
                      value={addForm.custom_name}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, custom_name: e.target.value }))
                      }
                      placeholder="管理用の表示名（任意）"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleAddFriend} disabled={addLoading} style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
                    {addLoading ? "追加中..." : "追加する"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── 友だち同期 結果バナー ─────────────────────────────── */}
      {syncResult && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            syncResult.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {syncResult.type === "success" ? (
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="flex-1 whitespace-pre-wrap">{syncResult.message}</div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            閉じる
          </button>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        {/* Search + Status Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="名前・LINE名で検索..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList>
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="active">アクティブ</TabsTrigger>
              <TabsTrigger value="blocked">ブロック</TabsTrigger>
              <TabsTrigger value="unfollowed">フォロー解除</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <TagIcon className="size-3.5" />
              タグ:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTagFilter(tag.id)}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? "text-white border-transparent"
                    : "text-gray-700 border-gray-200 bg-white hover:bg-gray-50"
                }`}
                style={
                  selectedTagIds.includes(tag.id)
                    ? { backgroundColor: tag.color }
                    : undefined
                }
              >
                {tag.name}
                {selectedTagIds.includes(tag.id) && (
                  <XIcon className="ml-1 size-3" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-600">
              {selectedIds.size}件選択中
            </span>
            <Button variant="ghost" size="sm" onClick={selectAllOnPage}>
              このページ全て選択
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              選択解除
            </Button>
            <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <TagIcon />
                  タグ一括追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>タグ一括追加</DialogTitle>
                  <DialogDescription>
                    選択した{selectedIds.size}件の友だちに、チェックしたタグをまとめて付与します。
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label className="text-sm font-medium">タグを選択（複数可）</Label>
                  <div className="mt-2 flex flex-wrap gap-2 rounded-md border p-2 max-h-64 overflow-y-auto">
                    {allTags.length === 0 && (
                      <span className="text-xs text-gray-400 py-1">
                        タグがありません
                      </span>
                    )}
                    {allTags.map((tag) => {
                      const isSelected = bulkTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleBulkTag(tag.id)}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                            isSelected
                              ? "text-white border-transparent"
                              : "text-gray-700 border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          style={
                            isSelected
                              ? { backgroundColor: tag.color }
                              : undefined
                          }
                        >
                          {tag.name}
                          {isSelected && <XIcon className="ml-1 size-3" />}
                        </button>
                      )
                    })}
                  </div>
                  {bulkTagIds.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {bulkTagIds.length}個のタグを{selectedIds.size}件に付与します
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setBulkTagDialogOpen(false)}
                    disabled={bulkTagSaving}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleBulkTagAssign}
                    disabled={bulkTagIds.length === 0 || bulkTagSaving}
                    style={{ backgroundColor: accentColor }}
                    className="text-white hover:opacity-90"
                  >
                    {bulkTagSaving ? "付与中..." : "付与する"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <DownloadIcon />
              選択をエクスポート
            </Button>
          </div>
        )}
      </div>

      {/* ── Desktop Table ───────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={friends.length > 0 && selectedIds.size === friends.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>LINE表示名</TableHead>
                  <TableHead>
                    <SortButton field="display_name">表示名</SortButton>
                  </TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>タグ</TableHead>
                  <TableHead>
                    <SortButton field="first_added_at">追加日</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="last_message_at">最終やりとり</SortButton>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="size-4" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-8 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="size-4" /></TableCell>
                      </TableRow>
                    ))
                  : friends.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <UsersIcon className="size-8" />
                            <p>友だちが見つかりませんでした</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : friends.map((friend) => {
                      const status = STATUS_MAP[friend.status]
                      return (
                        <TableRow key={friend.id} data-state={selectedIds.has(friend.id) ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(friend.id)}
                              onCheckedChange={() => toggleSelect(friend.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/friends/${friend.id}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <div className="relative">
                                <Avatar className="size-8">
                                  {friend.picture_url && (
                                    <AvatarImage src={friend.picture_url} alt={friend.display_name || ""} />
                                  )}
                                  <AvatarFallback>
                                    {(friend.display_name || "?").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {unreadFriendIds.has(friend.id) && (
                                  <span className="absolute -top-0.5 -right-0.5 size-3 bg-red-500 rounded-full border-2 border-white" />
                                )}
                              </div>
                              <span className="font-medium">{friend.display_name || "名前なし"}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {friend.custom_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status?.variant ?? "secondary"}>
                              {status?.label ?? friend.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {friend.tags.length > 0
                                ? friend.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))
                                : <span className="text-gray-400 text-xs">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {formatDateShort(friend.first_added_at)}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {friend.last_message_at
                              ? formatRelativeTime(friend.last_message_at)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/friends/${friend.id}`}>
                                    <UserIcon className="size-4" />
                                    詳細を見る
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/friends/${friend.id}?action=message`}>
                                    <MessageSquareIcon className="size-4" />
                                    メッセージを送る
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/friends/${friend.id}?action=tags`}>
                                    <TagIcon className="size-4" />
                                    タグを編集
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile Card Layout ──────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : friends.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UsersIcon className="size-8" />
                    <p>友だちが見つかりませんでした</p>
                  </div>
                </CardContent>
              </Card>
            )
          : friends.map((friend) => {
              const status = STATUS_MAP[friend.status]
              return (
                <Link key={friend.id} href={`/friends/${friend.id}`}>
                  <Card className="hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={selectedIds.has(friend.id)}
                            onCheckedChange={(e) => {
                              e // prevent link navigation
                              toggleSelect(friend.id)
                            }}
                            onClick={(e) => e.preventDefault()}
                          />
                        </div>
                        <div className="relative">
                          <Avatar className="size-10">
                            {friend.picture_url && (
                              <AvatarImage src={friend.picture_url} alt={friend.display_name || ""} />
                            )}
                            <AvatarFallback>
                              {(friend.display_name || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {unreadFriendIds.has(friend.id) && (
                            <span className="absolute -top-0.5 -right-0.5 size-3 bg-red-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {friend.display_name || "名前なし"}
                            </span>
                            <Badge variant={status?.variant ?? "secondary"} className="shrink-0">
                              {status?.label ?? friend.status}
                            </Badge>
                          </div>
                          {friend.custom_name && (
                            <p className="text-sm text-gray-500 truncate">
                              {friend.custom_name}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {friend.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>追加: {formatDateShort(friend.first_added_at)}</span>
                            {friend.last_message_at && (
                              <span>
                                最終: {formatRelativeTime(friend.last_message_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `全${total}件中 ${(page - 1) * pageSize + 1}〜${Math.min(page * pageSize, total)}件`
              : "0件"}
          </p>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500 whitespace-nowrap">表示件数</Label>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[84px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}件
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis")
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? "default" : "outline"}
                    size="icon"
                    className="size-8"
                    style={page === item ? { backgroundColor: accentColor } : undefined}
                    onClick={() => setPage(item as number)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
