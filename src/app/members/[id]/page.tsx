"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateShort, formatDate } from "@/lib/utils/date"
import {
  ArrowLeft,
  Pencil,
  UserIcon,
  CalendarDays,
  HeartIcon,
  MessageSquareIcon,
  GraduationCapIcon,
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

interface OmiaiRecord {
  id: string
  partner_name: string
  date: string
  venue: string
  status: string
  result: string | null
}

interface DatingRecord {
  id: string
  partner_name: string
  start_date: string
  status: string
}

interface InterviewRecord {
  id: string
  date: string
  notes: string
  counselor: string
}

interface CoachingRecord {
  id: string
  date: string
  time: string
  status: string
  notes: string | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string }
> = {
  active: { label: "活動中", bgColor: "#EC4899", textColor: "#ffffff" },
  on_hold: { label: "休会中", bgColor: "#EAB308", textColor: "#ffffff" },
  retired: { label: "退会", bgColor: "#6B7280", textColor: "#ffffff" },
  graduated: { label: "成婚", bgColor: "#22C55E", textColor: "#ffffff" },
}

// ── Main Component ─────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const accentColor = useAccentColor()
  const params = useParams<{ id: string }>()
  const memberId = params.id

  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    status: "" as Member["status"],
    desired_conditions: "",
    membership_number: "",
  })
  const [editLoading, setEditLoading] = useState(false)

  // Tab data
  const [activeTab, setActiveTab] = useState("omiai")
  const [omiaiRecords, setOmiaiRecords] = useState<OmiaiRecord[]>([])
  const [datingRecords, setDatingRecords] = useState<DatingRecord[]>([])
  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>([])
  const [coachingRecords, setCoachingRecords] = useState<CoachingRecord[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  // ── Fetch member ───────────────────────────────────────────────────

  const fetchMember = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/members/${memberId}`)
      if (!res.ok) throw new Error("Fetch failed")
      const json = await res.json()
      setMember(json.data)
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    fetchMember()
  }, [fetchMember])

  // ── Fetch tab data ─────────────────────────────────────────────────

  useEffect(() => {
    if (!memberId) return
    setTabLoading(true)

    const endpoints: Record<string, string> = {
      omiai: `/api/members/${memberId}/omiai`,
      dating: `/api/members/${memberId}/dating`,
      interview: `/api/members/${memberId}/interviews`,
      coaching: `/api/members/${memberId}/coaching`,
    }

    const url = endpoints[activeTab]
    if (!url) return

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? []
        switch (activeTab) {
          case "omiai":
            setOmiaiRecords(data)
            break
          case "dating":
            setDatingRecords(data)
            break
          case "interview":
            setInterviewRecords(data)
            break
          case "coaching":
            setCoachingRecords(data)
            break
        }
      })
      .catch(() => {})
      .finally(() => setTabLoading(false))
  }, [memberId, activeTab])

  // ── Edit handler ───────────────────────────────────────────────────

  const openEdit = () => {
    if (!member) return
    setEditForm({
      status: member.status,
      desired_conditions: member.desired_conditions ?? "",
      membership_number: member.membership_number,
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    setEditLoading(true)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditOpen(false)
        fetchMember()
      }
    } finally {
      setEditLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-100" />
          <div className="h-48 rounded bg-gray-100" />
        </div>
      </AppLayout>
    )
  }

  if (!member) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-gray-500">
          会員が見つかりませんでした
        </div>
      </AppLayout>
    )
  }

  const statusCfg = STATUS_CONFIG[member.status]
  const memberName =
    member.friend?.display_name || member.friend?.line_display_name || "-"

  return (
    <AppLayout>
      <PageHeader
        title="会員詳細"
        description={memberName}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/members">
                <ArrowLeft className="size-4" />
                一覧に戻る
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={openEdit}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              <Pencil className="size-4" />
              編集
            </Button>
          </div>
        }
      />

      {/* ── Profile Card ────────────────────────────────────────── */}
      <Card className="mb-6" style={{ borderTopColor: accentColor, borderTopWidth: "3px" }}>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">会員番号</p>
              <p className="font-mono font-semibold">
                {member.membership_number}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">ステータス</p>
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
            <div>
              <p className="text-xs text-gray-500 mb-1">入会日</p>
              <p className="text-sm">{formatDate(member.enrollment_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">希望条件</p>
              <p className="text-sm">
                {member.desired_conditions || "未設定"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="omiai" className="gap-1">
            <HeartIcon className="size-3.5" />
            お見合い履歴
          </TabsTrigger>
          <TabsTrigger value="dating" className="gap-1">
            <UserIcon className="size-3.5" />
            交際状況
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-1">
            <MessageSquareIcon className="size-3.5" />
            面談記録
          </TabsTrigger>
          <TabsTrigger value="coaching" className="gap-1">
            <GraduationCapIcon className="size-3.5" />
            コーチング
          </TabsTrigger>
        </TabsList>

        {/* お見合い履歴 */}
        <TabsContent value="omiai" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {tabLoading ? (
                <div className="p-8 text-center text-gray-400">読み込み中...</div>
              ) : omiaiRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  お見合い履歴がありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>お相手</TableHead>
                      <TableHead>日付</TableHead>
                      <TableHead>場所</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>結果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {omiaiRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.partner_name}
                        </TableCell>
                        <TableCell>{formatDateShort(record.date)}</TableCell>
                        <TableCell>{record.venue}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell>{record.result ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交際状況 */}
        <TabsContent value="dating" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {tabLoading ? (
                <div className="p-8 text-center text-gray-400">読み込み中...</div>
              ) : datingRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  交際履歴がありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>お相手</TableHead>
                      <TableHead>交際開始日</TableHead>
                      <TableHead>ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.partner_name}
                        </TableCell>
                        <TableCell>
                          {formatDateShort(record.start_date)}
                        </TableCell>
                        <TableCell>{record.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 面談記録 */}
        <TabsContent value="interview" className="mt-4">
          <div className="space-y-3">
            {tabLoading ? (
              <div className="p-8 text-center text-gray-400">読み込み中...</div>
            ) : interviewRecords.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  面談記録がありません
                </CardContent>
              </Card>
            ) : (
              interviewRecords.map((record) => (
                <Card key={record.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {formatDate(record.date)}
                      </CardTitle>
                      <span className="text-xs text-gray-500">
                        担当: {record.counselor}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {record.notes}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* コーチング */}
        <TabsContent value="coaching" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {tabLoading ? (
                <div className="p-8 text-center text-gray-400">読み込み中...</div>
              ) : coachingRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  コーチング記録がありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>時間</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>メモ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateShort(record.date)}</TableCell>
                        <TableCell>{record.time}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.notes ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会員情報を編集</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-number">会員番号</Label>
              <Input
                id="edit-number"
                value={editForm.membership_number}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    membership_number: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">ステータス</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm((f) => ({
                    ...f,
                    status: v as Member["status"],
                  }))
                }
              >
                <SelectTrigger id="edit-status">
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
            <div className="grid gap-2">
              <Label htmlFor="edit-conditions">希望条件</Label>
              <Textarea
                id="edit-conditions"
                value={editForm.desired_conditions}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    desired_conditions: e.target.value,
                  }))
                }
                rows={4}
                placeholder="希望条件を入力..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              {editLoading ? "保存中..." : "保存する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
