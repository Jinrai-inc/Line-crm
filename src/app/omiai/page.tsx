"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
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
  PlusIcon,
  HeartIcon,
  CalendarDays,
  MapPinIcon,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface Member {
  id: string
  membership_number: string
  friend: {
    display_name: string | null
    line_display_name: string
  }
}

interface Omiai {
  id: string
  member1_id: string
  member2_id: string
  member1: Member
  member2: Member
  date: string
  venue: string
  status: "scheduled" | "completed" | "cancelled" | "matched"
  notes: string | null
}

type OmiaiStatus = "all" | "scheduled" | "completed" | "cancelled" | "matched"

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  scheduled: { label: "予定", bgColor: "#3B82F6", textColor: "#ffffff" },
  completed: { label: "完了", bgColor: "#22C55E", textColor: "#ffffff" },
  cancelled: { label: "中止", bgColor: "#EF4444", textColor: "#ffffff" },
  matched: { label: "成立", bgColor: "#EC4899", textColor: "#ffffff" },
}

// ── Helper ─────────────────────────────────────────────────────────────

function getMemberName(member: Member): string {
  return member.friend?.display_name || member.friend?.line_display_name || "-"
}

// ── Main Page Component ────────────────────────────────────────────────

export default function OmiaiPage() {
  const accentColor = useAccentColor()
  const [records, setRecords] = useState<Omiai[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OmiaiStatus>("all")

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [addForm, setAddForm] = useState({
    member1_id: "",
    member2_id: "",
    date: "",
    venue: "",
  })
  const [addLoading, setAddLoading] = useState(false)

  // ── Fetch records ──────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/omiai?${params}`)
      if (!res.ok) throw new Error("Fetch failed")
      const json = await res.json()
      setRecords(json.data ?? [])
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Fetch members for add dialog
  useEffect(() => {
    if (addDialogOpen) {
      fetch("/api/members?limit=100")
        .then((r) => r.json())
        .then((json) => setMembers(json.data ?? []))
        .catch(() => {})
    }
  }, [addDialogOpen])

  // ── Actions ────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.member1_id || !addForm.member2_id || !addForm.date) return
    setAddLoading(true)
    try {
      const res = await fetch("/api/omiai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ member1_id: "", member2_id: "", date: "", venue: "" })
        fetchRecords()
      }
    } finally {
      setAddLoading(false)
    }
  }

  const handleStatusChange = async (
    id: string,
    newStatus: Omiai["status"]
  ) => {
    try {
      const res = await fetch(`/api/omiai/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchRecords()
    } catch {
      // handle error
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <PageHeader
        title="お見合い管理"
        description="お見合いのスケジュールと結果を管理"
        action={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                <PlusIcon />
                新規お見合い
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規お見合いを登録</DialogTitle>
                <DialogDescription>
                  お見合いの会員と日程を設定します。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>会員1 *</Label>
                  <Select
                    value={addForm.member1_id}
                    onValueChange={(v) =>
                      setAddForm((f) => ({ ...f, member1_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="会員を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members
                        .filter((m) => m.id !== addForm.member2_id)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {getMemberName(m)} ({m.membership_number})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>会員2 *</Label>
                  <Select
                    value={addForm.member2_id}
                    onValueChange={(v) =>
                      setAddForm((f) => ({ ...f, member2_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="会員を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members
                        .filter((m) => m.id !== addForm.member1_id)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {getMemberName(m)} ({m.membership_number})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>日付 *</Label>
                  <Input
                    type="date"
                    value={addForm.date}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>場所</Label>
                  <Input
                    value={addForm.venue}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, venue: e.target.value }))
                    }
                    placeholder="例: 東京ホテルラウンジ"
                  />
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
                  onClick={handleAdd}
                  disabled={addLoading}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90"
                >
                  {addLoading ? "登録中..." : "登録する"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as OmiaiStatus)}
        >
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="scheduled">予定</TabsTrigger>
            <TabsTrigger value="completed">完了</TabsTrigger>
            <TabsTrigger value="cancelled">中止</TabsTrigger>
            <TabsTrigger value="matched">成立</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Desktop Table ───────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会員1</TableHead>
                  <TableHead>会員2</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>場所</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="h-12">
                          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <HeartIcon className="size-8" />
                            <p>お見合い記録がありません</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : records.map((record) => {
                      const statusCfg = STATUS_CONFIG[record.status]
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {getMemberName(record.member1)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getMemberName(record.member2)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5 text-gray-400" />
                              {formatDateShort(record.date)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.venue ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPinIcon className="size-3.5 text-gray-400" />
                                {record.venue}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: statusCfg?.bgColor,
                                color: statusCfg?.textColor,
                                borderColor: "transparent",
                              }}
                            >
                              {statusCfg?.label ?? record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={record.status}
                              onValueChange={(v) =>
                                handleStatusChange(
                                  record.id,
                                  v as Omiai["status"]
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(
                                  ([key, cfg]) => (
                                    <SelectItem key={key} value={key}>
                                      {cfg.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
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
          : records.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <HeartIcon className="size-8" />
                    <p>お見合い記録がありません</p>
                  </div>
                </CardContent>
              </Card>
            )
          : records.map((record) => {
              const statusCfg = STATUS_CONFIG[record.status]
              return (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium" style={{ color: "#EC4899" }}>
                          {getMemberName(record.member1)} &times;{" "}
                          {getMemberName(record.member2)}
                        </p>
                      </div>
                      <Badge
                        style={{
                          backgroundColor: statusCfg?.bgColor,
                          color: statusCfg?.textColor,
                          borderColor: "transparent",
                        }}
                      >
                        {statusCfg?.label ?? record.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatDateShort(record.date)}
                      </span>
                      {record.venue && (
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="size-3.5" />
                          {record.venue}
                        </span>
                      )}
                    </div>
                    <Select
                      value={record.status}
                      onValueChange={(v) =>
                        handleStatusChange(record.id, v as Omiai["status"])
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </AppLayout>
  )
}
