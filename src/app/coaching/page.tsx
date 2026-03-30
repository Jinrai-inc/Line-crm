"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatDate, formatDateShort } from "@/lib/utils/date"
import {
  PlusIcon,
  CalendarDays,
  ClockIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface Friend {
  id: string
  line_display_name: string
  display_name: string | null
}

interface Coaching {
  id: string
  friend_id: string
  friend: Friend
  date: string
  time: string
  status: "booked" | "completed" | "cancelled"
  notes: string | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  booked: { label: "予約済", bgColor: "#3B82F6", textColor: "#ffffff" },
  completed: { label: "完了", bgColor: "#22C55E", textColor: "#ffffff" },
  cancelled: { label: "キャンセル", bgColor: "#6B7280", textColor: "#ffffff" },
}

// ── Helper ─────────────────────────────────────────────────────────────

function getFriendName(friend: Friend): string {
  return friend?.display_name || friend?.line_display_name || "-"
}

// ── Main Page Component ────────────────────────────────────────────────

export default function CoachingPage() {
  const [records, setRecords] = useState<Coaching[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [addForm, setAddForm] = useState({
    friend_id: "",
    date: "",
    time: "",
  })
  const [addLoading, setAddLoading] = useState(false)

  // ── Fetch records ──────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/coaching")
      if (!res.ok) throw new Error("Fetch failed")
      const json = await res.json()
      setRecords(json.data ?? [])
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Fetch friends for add dialog
  useEffect(() => {
    if (addDialogOpen) {
      fetch("/api/friends?limit=100")
        .then((r) => r.json())
        .then((json) => setFriends(json.data ?? []))
        .catch(() => {})
    }
  }, [addDialogOpen])

  // ── Group records by date ──────────────────────────────────────────

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Coaching[]> = {}
    const sorted = [...records].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })

    for (const record of sorted) {
      if (!groups[record.date]) groups[record.date] = []
      groups[record.date].push(record)
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [records])

  // ── Actions ────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.friend_id || !addForm.date || !addForm.time) return
    setAddLoading(true)
    try {
      const res = await fetch("/api/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ friend_id: "", date: "", time: "" })
        fetchRecords()
      }
    } finally {
      setAddLoading(false)
    }
  }

  const handleStatusChange = async (
    id: string,
    newStatus: Coaching["status"]
  ) => {
    try {
      const res = await fetch(`/api/coaching/${id}`, {
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
        title="コーチング予約管理"
        description="コーチングセッションの予約と管理"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href="/settings/calendar"
                className="inline-flex items-center gap-1"
              >
                <ExternalLinkIcon className="size-3.5" />
                カレンダー連携
              </a>
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  style={{ backgroundColor: "#EC4899" }}
                  className="text-white hover:opacity-90"
                >
                  <PlusIcon />
                  新規予約
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新規コーチング予約</DialogTitle>
                  <DialogDescription>
                    コーチングセッションの予約を登録します。
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>友だち *</Label>
                    <Select
                      value={addForm.friend_id}
                      onValueChange={(v) =>
                        setAddForm((f) => ({ ...f, friend_id: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="友だちを選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        {friends.map((friend) => (
                          <SelectItem key={friend.id} value={friend.id}>
                            {getFriendName(friend)}
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
                    <Label>時間 *</Label>
                    <Input
                      type="time"
                      value={addForm.time}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, time: e.target.value }))
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
          </div>
        }
      />

      {/* ── Calendar-style list ─────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
              <Card>
                <CardContent className="p-4">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : groupedByDate.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <GraduationCapIcon className="size-10" />
              <p>コーチング予約がありません</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, items]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays
                  className="size-4"
                  style={{ color: "#EC4899" }}
                />
                <h3 className="font-semibold text-sm">
                  {formatDate(date)}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {items.length}件
                </Badge>
              </div>

              {/* Records for this date */}
              <div className="space-y-2 ml-6">
                {items.map((record) => {
                  const statusCfg = STATUS_CONFIG[record.status]

                  return (
                    <Card key={record.id} className="hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Time */}
                            <div className="flex items-center gap-1 text-sm font-mono">
                              <ClockIcon
                                className="size-3.5"
                                style={{ color: "#EC4899" }}
                              />
                              {record.time.slice(0, 5)}
                            </div>

                            {/* Friend name */}
                            <span className="font-medium">
                              {getFriendName(record.friend)}
                            </span>

                            {/* Status badge */}
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

                          {/* Status change buttons */}
                          <div className="flex items-center gap-1">
                            {record.status === "booked" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    handleStatusChange(record.id, "completed")
                                  }
                                >
                                  完了
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-gray-500"
                                  onClick={() =>
                                    handleStatusChange(record.id, "cancelled")
                                  }
                                >
                                  キャンセル
                                </Button>
                              </>
                            )}
                            {record.status === "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                  handleStatusChange(record.id, "booked")
                                }
                              >
                                予約に戻す
                              </Button>
                            )}
                          </div>
                        </div>

                        {record.notes && (
                          <p className="text-xs text-gray-500 mt-2 ml-9">
                            {record.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
