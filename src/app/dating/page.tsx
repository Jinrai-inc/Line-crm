"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
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
  HeartHandshakeIcon,
  CalendarDays,
  ClockIcon,
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

interface Dating {
  id: string
  member1_id: string
  member2_id: string
  member1: Member
  member2: Member
  start_date: string
  status: "active" | "ended" | "engagement"
  notes: string | null
}

type DatingStatus = "all" | "active" | "ended" | "engagement"

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  active: { label: "交際中", bgColor: "#EC4899", textColor: "#ffffff" },
  ended: { label: "終了", bgColor: "#6B7280", textColor: "#ffffff" },
  engagement: { label: "婚約", bgColor: "#22C55E", textColor: "#ffffff" },
}

// ── Helper ─────────────────────────────────────────────────────────────

function getMemberName(member: Member): string {
  return member.friend?.display_name || member.friend?.line_display_name || "-"
}

function calcDaysElapsed(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ── Main Page Component ────────────────────────────────────────────────

export default function DatingPage() {
  const [records, setRecords] = useState<Dating[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<DatingStatus>("all")

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [addForm, setAddForm] = useState({
    member1_id: "",
    member2_id: "",
    start_date: "",
  })
  const [addLoading, setAddLoading] = useState(false)

  // ── Fetch records ──────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/dating?${params}`)
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
    if (!addForm.member1_id || !addForm.member2_id || !addForm.start_date)
      return
    setAddLoading(true)
    try {
      const res = await fetch("/api/dating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ member1_id: "", member2_id: "", start_date: "" })
        fetchRecords()
      }
    } finally {
      setAddLoading(false)
    }
  }

  const handleStatusChange = async (
    id: string,
    newStatus: Dating["status"]
  ) => {
    try {
      const res = await fetch(`/api/dating/${id}`, {
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
        title="交際管理"
        description="会員の交際状況を管理"
        action={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                style={{ backgroundColor: "#EC4899" }}
                className="text-white hover:opacity-90"
              >
                <PlusIcon />
                新規交際登録
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規交際を登録</DialogTitle>
                <DialogDescription>
                  交際する会員と開始日を設定します。
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
                  <Label>交際開始日 *</Label>
                  <Input
                    type="date"
                    value={addForm.start_date}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, start_date: e.target.value }))
                    }
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
                  style={{ backgroundColor: "#EC4899" }}
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
          onValueChange={(v) => setStatusFilter(v as DatingStatus)}
        >
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="active">交際中</TabsTrigger>
            <TabsTrigger value="ended">終了</TabsTrigger>
            <TabsTrigger value="engagement">婚約</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Card Layout ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <HeartHandshakeIcon className="size-10" />
              <p>交際記録がありません</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => {
            const statusCfg = STATUS_CONFIG[record.status]
            const days = calcDaysElapsed(record.start_date)

            return (
              <Card
                key={record.id}
                className="relative overflow-hidden"
                style={{ borderTopColor: "#EC4899", borderTopWidth: "3px" }}
              >
                <CardContent className="p-5">
                  {/* Couple names */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className="font-semibold"
                        style={{ color: "#EC4899" }}
                      >
                        {getMemberName(record.member1)}
                      </p>
                      <p className="text-xs text-gray-400 my-0.5">&amp;</p>
                      <p
                        className="font-semibold"
                        style={{ color: "#EC4899" }}
                      >
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

                  {/* Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDateShort(record.start_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {days}日経過
                    </span>
                  </div>

                  {/* Status change */}
                  <Select
                    value={record.status}
                    onValueChange={(v) =>
                      handleStatusChange(record.id, v as Dating["status"])
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
      )}
    </AppLayout>
  )
}
