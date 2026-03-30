"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate, formatRelativeTime } from "@/lib/utils/date"
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  CalendarCheck,
  AlertCircle,
} from "lucide-react"

// --- Types ---

interface Seminar {
  id: string
  title: string
  event_date: string
  status: string
}

interface Friend {
  id: string
  display_name: string
  custom_name?: string | null
  picture_url?: string | null
  line_user_id?: string
}

interface Attendance {
  id: string
  friend_id: string
  seminar_id: string
  status: "applied" | "confirmed" | "attended" | "cancelled"
  applied_at: string
  confirmed_at?: string | null
  attended_at?: string | null
  cancelled_at?: string | null
  friends: Friend
}

type AttendanceStatus = "all" | "applied" | "confirmed" | "attended" | "cancelled"

// --- Helpers ---

const STATUS_CONFIG: Record<
  Attendance["status"],
  { label: string; className: string }
> = {
  applied: {
    label: "申込済み",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  confirmed: {
    label: "確認済み",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  attended: {
    label: "出席",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "キャンセル",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

const STATUS_TABS: { value: AttendanceStatus; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "applied", label: "申込済み" },
  { value: "confirmed", label: "確認済み" },
  { value: "attended", label: "出席" },
  { value: "cancelled", label: "キャンセル" },
]

function getNextActions(
  status: Attendance["status"]
): { label: string; value: Attendance["status"] }[] {
  switch (status) {
    case "applied":
      return [
        { label: "確認済みにする", value: "confirmed" },
        { label: "キャンセル", value: "cancelled" },
      ]
    case "confirmed":
      return [
        { label: "出席にする", value: "attended" },
        { label: "キャンセル", value: "cancelled" },
      ]
    case "attended":
      return [{ label: "キャンセル", value: "cancelled" }]
    case "cancelled":
      return []
  }
}

function getFriendName(friend: Friend): string {
  return friend.custom_name || friend.display_name || "不明"
}

// --- Main Component ---

export default function AttendancesPage() {
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [selectedSeminarId, setSelectedSeminarId] = useState<string>("")
  const [selectedSeminarTitle, setSelectedSeminarTitle] = useState<string>("")
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus>("all")
  const [loading, setLoading] = useState(false)
  const [seminarsLoading, setSeminarsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [addFriendId, setAddFriendId] = useState("")
  const [addSeminarId, setAddSeminarId] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch seminars on mount
  useEffect(() => {
    async function fetchSeminars() {
      try {
        const res = await fetch("/api/seminars")
        if (!res.ok) throw new Error("セミナーの取得に失敗しました")
        const json = await res.json()
        setSeminars(json.data || [])
      } catch {
        setError("セミナーの取得に失敗しました")
      } finally {
        setSeminarsLoading(false)
      }
    }
    fetchSeminars()
  }, [])

  // Fetch attendances when seminar is selected
  const fetchAttendances = useCallback(async (seminarId: string) => {
    if (!seminarId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/seminars/${seminarId}`)
      if (!res.ok) throw new Error("参加者の取得に失敗しました")
      const json = await res.json()
      setAttendances(json.data?.attendees || [])
    } catch {
      setError("参加者の取得に失敗しました")
      setAttendances([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSeminarId) {
      fetchAttendances(selectedSeminarId)
    }
  }, [selectedSeminarId, fetchAttendances])

  // Fetch friends for add dialog
  useEffect(() => {
    if (!addDialogOpen) return
    async function fetchFriends() {
      setFriendsLoading(true)
      try {
        const res = await fetch("/api/friends?pageSize=200")
        if (!res.ok) throw new Error()
        const json = await res.json()
        setFriends(json.data || [])
      } catch {
        setFriends([])
      } finally {
        setFriendsLoading(false)
      }
    }
    fetchFriends()
  }, [addDialogOpen])

  // Handle seminar selection
  function handleSeminarSelect(seminarId: string) {
    setSelectedSeminarId(seminarId)
    const seminar = seminars.find((s) => s.id === seminarId)
    setSelectedSeminarTitle(seminar?.title || "")
    setStatusFilter("all")
  }

  // Handle status change
  async function handleStatusChange(
    attendanceId: string,
    newStatus: Attendance["status"]
  ) {
    try {
      const res = await fetch(`/api/attendances/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      // Refresh data
      await fetchAttendances(selectedSeminarId)
    } catch {
      setError("ステータスの変更に失敗しました")
    }
  }

  // Handle delete
  async function handleDelete(attendanceId: string) {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/attendances/${attendanceId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setDeleteId(null)
      await fetchAttendances(selectedSeminarId)
    } catch {
      setError("参加取消に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }

  // Handle add attendance
  async function handleAdd() {
    if (!addFriendId || !addSeminarId) return
    setAddLoading(true)
    try {
      const res = await fetch("/api/attendances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendId: addFriendId,
          seminarId: addSeminarId,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "登録に失敗しました")
      }
      setAddDialogOpen(false)
      setAddFriendId("")
      setAddSeminarId("")
      // Refresh if same seminar selected
      if (addSeminarId === selectedSeminarId) {
        await fetchAttendances(selectedSeminarId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加登録に失敗しました")
    } finally {
      setAddLoading(false)
    }
  }

  // Filter attendances by status
  const filteredAttendances =
    statusFilter === "all"
      ? attendances
      : attendances.filter((a) => a.status === statusFilter)

  return (
    <AppLayout>
      <PageHeader
        title="参加管理"
        description="セミナーの参加状況を管理します"
        action={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                参加登録
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>手動参加登録</DialogTitle>
                <DialogDescription>
                  友だちとセミナーを選択して参加登録を行います
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Seminar select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    セミナー
                  </label>
                  <Select value={addSeminarId} onValueChange={setAddSeminarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="セミナーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {seminars.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Friend select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    友だち
                  </label>
                  {friendsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      読み込み中...
                    </div>
                  ) : (
                    <Select value={addFriendId} onValueChange={setAddFriendId}>
                      <SelectTrigger>
                        <SelectValue placeholder="友だちを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {friends.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {getFriendName(f)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                  disabled={!addFriendId || !addSeminarId || addLoading}
                >
                  {addLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  登録する
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Seminar filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          セミナー選択
        </label>
        {seminarsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            セミナーを読み込み中...
          </div>
        ) : (
          <Select
            value={selectedSeminarId}
            onValueChange={handleSeminarSelect}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="セミナーを選択してください" />
            </SelectTrigger>
            <SelectContent>
              {seminars.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}（{formatDate(s.event_date)}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* No seminar selected */}
      {!selectedSeminarId && !seminarsLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
            <CalendarCheck className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">セミナーを選択してください</p>
            <p className="text-sm mt-1">
              上のドロップダウンからセミナーを選択すると、参加者一覧が表示されます
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Attendances content */}
      {selectedSeminarId && !loading && (
        <>
          {/* Status tabs */}
          <div className="mb-4">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as AttendanceStatus)}
            >
              <TabsList>
                {STATUS_TABS.map((tab) => {
                  const count =
                    tab.value === "all"
                      ? attendances.length
                      : attendances.filter((a) => a.status === tab.value).length
                  return (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                      <span className="ml-1 text-xs text-gray-400">
                        ({count})
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>

          {filteredAttendances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm">該当する参加者はいません</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>友だち名</TableHead>
                        <TableHead>セミナー</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>申込日</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendances.map((attendance) => (
                        <AttendanceTableRow
                          key={attendance.id}
                          attendance={attendance}
                          seminarTitle={selectedSeminarTitle}
                          onStatusChange={handleStatusChange}
                          onDeleteClick={setDeleteId}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filteredAttendances.map((attendance) => (
                  <AttendanceCard
                    key={attendance.id}
                    attendance={attendance}
                    seminarTitle={selectedSeminarTitle}
                    onStatusChange={handleStatusChange}
                    onDeleteClick={setDeleteId}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>参加記録の削除</DialogTitle>
            <DialogDescription>
              この参加記録を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

// --- Sub-components ---

function AttendanceTableRow({
  attendance,
  seminarTitle,
  onStatusChange,
  onDeleteClick,
}: {
  attendance: Attendance
  seminarTitle: string
  onStatusChange: (id: string, status: Attendance["status"]) => void
  onDeleteClick: (id: string) => void
}) {
  const config = STATUS_CONFIG[attendance.status]
  const actions = getNextActions(attendance.status)

  return (
    <TableRow>
      <TableCell className="font-medium">
        {getFriendName(attendance.friends)}
      </TableCell>
      <TableCell className="text-gray-600">{seminarTitle}</TableCell>
      <TableCell>
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="text-gray-500 text-sm">
        {attendance.applied_at ? formatRelativeTime(attendance.applied_at) : "-"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {actions.length > 0 && (
            <Select
              onValueChange={(value) =>
                onStatusChange(attendance.id, value as Attendance["status"])
              }
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="ステータス変更" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
            onClick={() => onDeleteClick(attendance.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AttendanceCard({
  attendance,
  seminarTitle,
  onStatusChange,
  onDeleteClick,
}: {
  attendance: Attendance
  seminarTitle: string
  onStatusChange: (id: string, status: Attendance["status"]) => void
  onDeleteClick: (id: string) => void
}) {
  const config = STATUS_CONFIG[attendance.status]
  const actions = getNextActions(attendance.status)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">
              {getFriendName(attendance.friends)}
            </p>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {seminarTitle}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={config.className}>
                {config.label}
              </Badge>
              <span className="text-xs text-gray-400">
                {attendance.applied_at
                  ? formatRelativeTime(attendance.applied_at)
                  : "-"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
            onClick={() => onDeleteClick(attendance.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {actions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Select
              onValueChange={(value) =>
                onStatusChange(attendance.id, value as Attendance["status"])
              }
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="ステータス変更" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
