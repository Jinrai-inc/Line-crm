"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateShort } from "@/lib/utils/date"
import {
  SearchIcon,
  PlusIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface Friend {
  id: string
  line_display_name: string
  display_name: string | null
}

interface Member {
  id: string
  membership_number: string
  friend_id: string
  friend: Friend
  status: "active" | "on_hold" | "retired" | "graduated"
  enrollment_date: string
  desired_conditions: string | null
}

interface MembersResponse {
  data: Member[]
  total: number
  page: number
  limit: number
}

type MemberStatus = "all" | "active" | "on_hold" | "retired" | "graduated"

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  active: { label: "活動中", bgColor: "#EC4899", textColor: "#ffffff" },
  on_hold: { label: "休会中", bgColor: "#EAB308", textColor: "#ffffff" },
  retired: { label: "退会", bgColor: "#6B7280", textColor: "#ffffff" },
  graduated: { label: "成婚", bgColor: "#22C55E", textColor: "#ffffff" },
}

const LIMIT = 20

// ── Main Page Component ────────────────────────────────────────────────

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<MemberStatus>("all")

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    friend_id: "",
    membership_number: "",
    status: "active" as Member["status"],
  })
  const [addLoading, setAddLoading] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])

  // ── Fetch members ──────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/members?${params}`)
      if (!res.ok) throw new Error("Fetch failed")
      const json: MembersResponse = await res.json()
      setMembers(json.data)
      setTotal(json.total)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Fetch friends for add dialog
  useEffect(() => {
    if (addDialogOpen) {
      fetch("/api/friends?limit=100")
        .then((r) => r.json())
        .then((json) => setFriends(json.data ?? []))
        .catch(() => {})
    }
  }, [addDialogOpen])

  // ── Helpers ────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as MemberStatus)
    setPage(1)
  }

  // ── Actions ────────────────────────────────────────────────────────

  const handleAddMember = async () => {
    if (!addForm.friend_id || !addForm.membership_number.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ friend_id: "", membership_number: "", status: "active" })
        fetchMembers()
      }
    } finally {
      setAddLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <PageHeader
        title="会員一覧"
        description="結婚相談所の会員管理"
        action={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                style={{ backgroundColor: "#EC4899" }}
                className="text-white hover:opacity-90"
              >
                <PlusIcon />
                会員追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>会員を追加</DialogTitle>
                <DialogDescription>
                  友だちを選択して会員登録を行います。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="add-friend">友だちを選択 *</Label>
                  <Select
                    value={addForm.friend_id}
                    onValueChange={(v) =>
                      setAddForm((f) => ({ ...f, friend_id: v }))
                    }
                  >
                    <SelectTrigger id="add-friend">
                      <SelectValue placeholder="友だちを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {friends.map((friend) => (
                        <SelectItem key={friend.id} value={friend.id}>
                          {friend.display_name || friend.line_display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-number">会員番号 *</Label>
                  <Input
                    id="add-number"
                    value={addForm.membership_number}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        membership_number: e.target.value,
                      }))
                    }
                    placeholder="例: M-0001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-status">ステータス</Label>
                  <Select
                    value={addForm.status}
                    onValueChange={(v) =>
                      setAddForm((f) => ({
                        ...f,
                        status: v as Member["status"],
                      }))
                    }
                  >
                    <SelectTrigger id="add-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={addLoading}
                  style={{ backgroundColor: "#EC4899" }}
                  className="text-white hover:opacity-90"
                >
                  {addLoading ? "追加中..." : "追加する"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="名前・会員番号で検索..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList>
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="active">活動中</TabsTrigger>
              <TabsTrigger value="on_hold">休会中</TabsTrigger>
              <TabsTrigger value="retired">退会</TabsTrigger>
              <TabsTrigger value="graduated">成婚</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Desktop Table ───────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会員番号</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>入会日</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-12">
                          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <UsersIcon className="size-8" />
                            <p>会員が見つかりませんでした</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : members.map((member) => {
                      const statusCfg = STATUS_CONFIG[member.status]
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-mono text-sm">
                            {member.membership_number}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/members/${member.id}`}
                              className="font-medium hover:underline"
                              style={{ color: "#EC4899" }}
                            >
                              {member.friend?.display_name ||
                                member.friend?.line_display_name ||
                                "-"}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: statusCfg?.bgColor,
                                color: statusCfg?.textColor,
                                borderColor: "transparent",
                              }}
                            >
                              {statusCfg?.label ?? member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {formatDateShort(member.enrollment_date)}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/members/${member.id}`}>詳細</Link>
                            </Button>
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
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                </CardContent>
              </Card>
            ))
          : members.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UsersIcon className="size-8" />
                    <p>会員が見つかりませんでした</p>
                  </div>
                </CardContent>
              </Card>
            )
          : members.map((member) => {
              const statusCfg = STATUS_CONFIG[member.status]
              return (
                <Link key={member.id} href={`/members/${member.id}`}>
                  <Card className="hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-gray-500">
                            {member.membership_number}
                          </p>
                          <p className="font-medium mt-0.5">
                            {member.friend?.display_name ||
                              member.friend?.line_display_name ||
                              "-"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            入会: {formatDateShort(member.enrollment_date)}
                          </p>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: statusCfg?.bgColor,
                            color: statusCfg?.textColor,
                            borderColor: "transparent",
                          }}
                        >
                          {statusCfg?.label ?? member.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            全{total}件中 {(page - 1) * LIMIT + 1}〜
            {Math.min(page * LIMIT, total)}件
          </p>
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
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
              )
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("ellipsis")
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
        </div>
      )}
    </AppLayout>
  )
}
