"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { formatDate, formatTime, formatDateTime } from "@/lib/utils/date"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Pencil,
  UserPlus,
  Search,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  Tag,
  ClipboardList,
  CreditCard,
  Video,
} from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string | null
}

interface Friend {
  id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
}

interface Attendee {
  id: string
  friends: Friend | null
  status: "applied" | "confirmed" | "attended" | "cancelled"
  applied_at: string | null
  confirmed_at: string | null
  attended_at: string | null
}

interface Seminar {
  id: string
  title: string
  description: string
  event_date: string | null
  start_time: string
  end_time: string
  location: string | null
  capacity: number
  status: "open" | "closed" | "cancelled"
  attendee_count: number
  attendees: Attendee[]
  tag_ids?: string[]
  payment_url?: string | null
  zoom_url?: string | null
  price?: number | null
  post_payment_url?: string | null
  post_payment_message?: string | null
  zoom_note?: string | null
}

const statusLabels: Record<string, string> = {
  open: "受付中",
  closed: "締切",
  cancelled: "中止",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  closed: "secondary",
  cancelled: "destructive",
}

const attendeeStatusLabels: Record<string, string> = {
  applied: "申込済",
  confirmed: "確認済",
  attended: "出席",
  cancelled: "キャンセル",
}

const attendeeStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "outline",
  confirmed: "secondary",
  attended: "default",
  cancelled: "destructive",
}

export default function SeminarDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [seminar, setSeminar] = useState<Seminar | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [addAttendeeOpen, setAddAttendeeOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [friendSearch, setFriendSearch] = useState("")
  const [friendResults, setFriendResults] = useState<Friend[]>([])
  const [searchingFriends, setSearchingFriends] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviteSearch, setInviteSearch] = useState("")
  const [inviteResults, setInviteResults] = useState<Friend[]>([])
  const [searchingInvite, setSearchingInvite] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState<Friend[]>([])
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string>("")
  const [loadingByTag, setLoadingByTag] = useState(false)

  // アンケート関連
  const [surveyData, setSurveyData] = useState<{ title: string; questions: Array<{ label: string; choices: Array<{ text: string }> }>; enabled: boolean } | null>(null)
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveySending, setSurveySending] = useState(false)
  const [surveySendResult, setSurveySendResult] = useState<{ sentCount: number; failedCount: number } | null>(null)

  // 編集フォーム
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    dateTbd: false,
    start_time: "",
    end_time: "",
    venue: "",
    capacity: 0,
    tag_ids: [] as string[],
    payment_url: "",
    zoom_url: "",
    price: 0,
    post_payment_url: "",
    post_payment_message: "",
    zoom_note: "",
  })
  const [allTags, setAllTags] = useState<Tag[]>([])

  const fetchSeminar = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/seminars/${id}`)
      const json = await res.json()
      setSeminar(json.data ?? null)
    } catch {
      console.error("セミナー情報の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchSurvey = useCallback(async () => {
    try {
      setSurveyLoading(true)
      const res = await fetch(`/api/seminars/${id}/survey`)
      const json = await res.json()
      if (json.data) {
        const questions = typeof json.data.questions === "string"
          ? JSON.parse(json.data.questions)
          : json.data.questions || []
        setSurveyData({ title: json.data.title, questions, enabled: json.data.enabled })
      }
    } catch {
      // アンケート未設定の場合は無視
    } finally {
      setSurveyLoading(false)
    }
  }, [id])

  async function handleSurveySend() {
    setSurveySending(true)
    setSurveySendResult(null)
    try {
      const res = await fetch(`/api/seminars/${id}/survey/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const json = await res.json()
        setSurveySendResult(json)
      }
    } catch {
      console.error("アンケート送信に失敗しました")
    } finally {
      setSurveySending(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchSeminar()
      fetchSurvey()
    }
  }, [id, fetchSeminar, fetchSurvey])

  function openEditDialog() {
    if (!seminar) return
    setEditForm({
      title: seminar.title,
      description: seminar.description,
      date: seminar.event_date || "",
      dateTbd: !seminar.event_date,
      start_time: seminar.start_time || "",
      end_time: seminar.end_time || "",
      venue: seminar.location || "",
      capacity: seminar.capacity,
      tag_ids: seminar.tag_ids || [],
      payment_url: seminar.payment_url || "",
      zoom_url: seminar.zoom_url || "",
      price: seminar.price || 0,
      post_payment_url: seminar.post_payment_url || "",
      post_payment_message: seminar.post_payment_message || "",
      zoom_note: seminar.zoom_note || "",
    })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    try {
      setSaving(true)
      const res = await fetch(`/api/seminars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          eventDate: editForm.dateTbd ? null : editForm.date,
          startTime: editForm.start_time,
          endTime: editForm.end_time,
          location: editForm.venue,
          capacity: editForm.capacity,
          tag_ids: editForm.tag_ids,
          paymentUrl: editForm.payment_url,
          zoomUrl: editForm.zoom_url,
          price: editForm.price || null,
          postPaymentUrl: editForm.post_payment_url || null,
          postPaymentMessage: editForm.post_payment_message || null,
          zoomNote: editForm.zoom_note || null,
        }),
      })
      if (res.ok) {
        setEditOpen(false)
        fetchSeminar()
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error("セミナー更新エラー:", errData)
        alert("保存に失敗しました: " + (errData.error || "不明なエラー"))
      }
    } catch (err) {
      console.error("更新に失敗しました", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/seminars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchSeminar()
    } catch {
      console.error("ステータス変更に失敗しました")
    }
  }

  async function searchFriends(query: string) {
    setFriendSearch(query)
    if (query.length < 1) {
      setFriendResults([])
      return
    }
    try {
      setSearchingFriends(true)
      const res = await fetch(`/api/friends?search=${encodeURIComponent(query)}`)
      const json = await res.json()
      setFriendResults(json.data ?? [])
    } catch {
      console.error("友だち検索に失敗しました")
    } finally {
      setSearchingFriends(false)
    }
  }

  async function addAttendee(friendId: string) {
    try {
      const res = await fetch("/api/attendances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seminarId: id, friendId }),
      })
      if (res.ok) {
        setAddAttendeeOpen(false)
        setFriendSearch("")
        setFriendResults([])
        fetchSeminar()
      }
    } catch {
      console.error("参加者の追加に失敗しました")
    }
  }

  async function changeAttendeeStatus(attendeeId: string, status: string) {
    try {
      const res = await fetch(`/api/attendances/${attendeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) fetchSeminar()
    } catch {
      console.error("ステータス変更に失敗しました")
    }
  }

  async function deleteAttendee(attendeeId: string) {
    if (!confirm("この申込を削除しますか？削除すると再申込が可能になります。")) return
    try {
      const res = await fetch(`/api/attendances/${attendeeId}`, { method: "DELETE" })
      if (res.ok) fetchSeminar()
    } catch {
      console.error("申込の削除に失敗しました")
    }
  }

  async function fetchTags() {
    try {
      const res = await fetch("/api/tags")
      const json = await res.json()
      const tagList = json.data ?? []
      setTags(tagList)
      setAllTags(tagList)
    } catch {
      console.error("タグ取得に失敗しました")
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  async function searchInviteFriends(query: string) {
    setInviteSearch(query)
    if (query.length < 1 && !selectedTagId) {
      setInviteResults([])
      return
    }
    try {
      setSearchingInvite(true)
      const params = new URLSearchParams({ pageSize: "100" })
      if (query) params.set("search", query)
      if (selectedTagId) params.set("tagIds", selectedTagId)
      const res = await fetch(`/api/friends?${params}`)
      const json = await res.json()
      setInviteResults(json.data ?? [])
    } catch {
      console.error("友だち検索に失敗しました")
    } finally {
      setSearchingInvite(false)
    }
  }

  async function handleTagSelect(tagId: string) {
    const actualTagId = tagId === "all" ? "" : tagId
    setSelectedTagId(actualTagId)
    if (!actualTagId && !inviteSearch) {
      setInviteResults([])
      return
    }
    try {
      setLoadingByTag(true)
      const params = new URLSearchParams({ pageSize: "100" })
      if (inviteSearch) params.set("search", inviteSearch)
      if (actualTagId) params.set("tagIds", actualTagId)
      const res = await fetch(`/api/friends?${params}`)
      const json = await res.json()
      setInviteResults(json.data ?? [])
    } catch {
      console.error("タグ検索に失敗しました")
    } finally {
      setLoadingByTag(false)
    }
  }

  function selectAllResults() {
    const newInvitees = [...selectedInvitees]
    for (const f of inviteResults) {
      if (!newInvitees.some((s) => s.id === f.id)) {
        newInvitees.push(f)
      }
    }
    setSelectedInvitees(newInvitees)
  }

  function toggleInvitee(friend: Friend) {
    setSelectedInvitees((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    )
  }

  async function handleSendInvite() {
    if (selectedInvitees.length === 0) return
    try {
      setSending(true)
      setSendResult(null)
      const res = await fetch(`/api/seminars/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendIds: selectedInvitees.map((f) => f.id) }),
      })
      const json = await res.json()
      if (res.ok) {
        setSendResult(`${json.data.sentCount}名に案内を送信しました`)
        setSelectedInvitees([])
        setInviteSearch("")
        setInviteResults([])
      } else {
        setSendResult(json.error || "送信に失敗しました")
      }
    } catch {
      setSendResult("送信に失敗しました")
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!confirm("このセミナーを削除しますか？参加者情報も削除されます。")) return
    try {
      const res = await fetch(`/api/seminars/${id}`, { method: "DELETE" })
      if (res.ok) router.push("/seminars")
    } catch {
      console.error("削除に失敗しました")
    }
  }

  // 参加者統計
  const stats = seminar
    ? {
        applied: seminar.attendees.filter((a) => a.status === "applied").length,
        confirmed: seminar.attendees.filter((a) => a.status === "confirmed").length,
        attended: seminar.attendees.filter((a) => a.status === "attended").length,
        cancelled: seminar.attendees.filter((a) => a.status === "cancelled").length,
      }
    : { applied: 0, confirmed: 0, attended: 0, cancelled: 0 }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      </AppLayout>
    )
  }

  if (!seminar) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-gray-500">セミナーが見つかりません</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/seminars")}>
            一覧に戻る
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title={seminar.title}
        description="セミナー詳細"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/seminars")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              一覧に戻る
            </Button>
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}/followup`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              フォローアップ
            </Button>
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}/survey`)}>
              <ClipboardList className="h-4 w-4 mr-2" />
              アンケート
            </Button>
            <Button variant="outline" onClick={openEditDialog}>
              <Pencil className="h-4 w-4 mr-2" />
              編集
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* セミナー情報 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>セミナー情報</CardTitle>
                <Badge variant={statusVariants[seminar.status]}>
                  {statusLabels[seminar.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {seminar.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">説明</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{seminar.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">日付:</span>
                  <span>{seminar.event_date ? formatDate(seminar.event_date) : "日付未定"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">時間:</span>
                  <span>
                    {seminar.start_time ? formatTime(seminar.start_time) : "未設定"} - {seminar.end_time ? formatTime(seminar.end_time) : "未設定"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">会場:</span>
                  <span>{seminar.location || "未設定"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">定員:</span>
                  <span>
                    {seminar.attendee_count} / {seminar.capacity}名
                  </span>
                </div>
              </div>

              {/* ステータス変更 */}
              <div className="pt-2 border-t">
                <Label className="text-sm text-gray-500 mb-2 block">ステータス変更</Label>
                <Select value={seminar.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">受付中</SelectItem>
                    <SelectItem value="closed">締切</SelectItem>
                    <SelectItem value="cancelled">中止</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 参加者一覧 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>参加者一覧</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setInviteOpen(true); setSendResult(null) }}>
                    <Send className="h-4 w-4 mr-2" />
                    LINE案内送信
                  </Button>
                  <Button size="sm" onClick={() => setAddAttendeeOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    参加者追加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {seminar.attendees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">参加者がいません</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名前</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>申込日時</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seminar.attendees.map((attendee) => (
                        <TableRow key={attendee.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {attendee.friends?.picture_url ? (
                                <img
                                  src={attendee.friends.picture_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <span className="text-sm font-medium">
                                {attendee.friends?.custom_name || attendee.friends?.display_name || "名前なし"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={attendeeStatusVariants[attendee.status]}>
                              {attendeeStatusLabels[attendee.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {attendee.applied_at ? formatDateTime(attendee.applied_at) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={attendee.status}
                                onValueChange={(value) =>
                                  changeAttendeeStatus(attendee.id, value)
                                }
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="applied">申込済</SelectItem>
                                  <SelectItem value="confirmed">確認済</SelectItem>
                                  <SelectItem value="attended">出席</SelectItem>
                                  <SelectItem value="cancelled">キャンセル</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => deleteAttendee(attendee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* サイドバー: 統計 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>参加者統計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">申込済</span>
                <Badge variant="outline">{stats.applied}名</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">確認済</span>
                <Badge variant="secondary">{stats.confirmed}名</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">出席</span>
                <Badge variant="default">{stats.attended}名</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">キャンセル</span>
                <Badge variant="destructive">{stats.cancelled}名</Badge>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">合計</span>
                  <span className="text-sm font-bold">
                    {seminar.attendees.length}名 / {seminar.capacity}名
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アンケート */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-green-600" />
                  アンケート
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => router.push(`/seminars/${id}/survey`)}
                >
                  設定
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {surveyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ) : surveyData && surveyData.questions.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{surveyData.title}</p>
                      <Badge variant={surveyData.enabled ? "default" : "secondary"}>
                        {surveyData.enabled ? "有効" : "無効"}
                      </Badge>
                    </div>
                    {surveyData.questions.map((q, i) => (
                      <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
                        <p className="font-medium text-gray-700 mb-1">Q{i + 1}. {q.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {q.choices.map((c, ci) => (
                            <span key={ci} className="inline-block px-2 py-0.5 bg-white border rounded text-gray-600">
                              {c.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {surveySendResult ? (
                    <div className="text-center py-2">
                      <p className="text-sm text-green-600 font-medium">
                        {surveySendResult.sentCount}名に送信完了
                      </p>
                      {surveySendResult.failedCount > 0 && (
                        <p className="text-xs text-red-500">{surveySendResult.failedCount}件失敗</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleSurveySend}
                      disabled={surveySending || seminar.attendees.length === 0}
                    >
                      {surveySending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      参加者にアンケート送信
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <ClipboardList className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500 mb-3">アンケートが未設定です</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/seminars/${id}/survey`)}
                  >
                    アンケートを作成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>セミナー編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div>
              <Label htmlFor="edit-title">タイトル</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">説明</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">日付</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  disabled={editForm.dateTbd}
                />
                <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.dateTbd}
                    onChange={(e) => setEditForm({ ...editForm, dateTbd: e.target.checked, date: e.target.checked ? "" : editForm.date })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-500">日付未定</span>
                </label>
              </div>
              <div>
                <Label htmlFor="edit-venue">会場</Label>
                <Input
                  id="edit-venue"
                  value={editForm.venue}
                  onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-start">開始時間</Label>
                <Input
                  id="edit-start"
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-end">終了時間</Label>
                <Input
                  id="edit-end"
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-capacity">定員</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  value={editForm.capacity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* タグ設定 */}
            <div>
              <Label className="flex items-center gap-1 mb-1.5">
                <Tag className="h-3.5 w-3.5" />
                タグ
              </Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-white">
                {allTags.map((tag) => {
                  const isSelected = editForm.tag_ids.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setEditForm({
                          ...editForm,
                          tag_ids: isSelected
                            ? editForm.tag_ids.filter((id) => id !== tag.id)
                            : [...editForm.tag_ids, tag.id],
                        })
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        isSelected
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
                {allTags.length === 0 && (
                  <span className="text-xs text-gray-400 py-1">タグがありません</span>
                )}
              </div>
            </div>

            {/* 決済・Zoom設定 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                決済・参加リンク設定
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">参加費（円）</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min={0}
                    value={editForm.price || ""}
                    onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                    placeholder="0（無料の場合は空欄）"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-payment-url">決済リンクURL</Label>
                  <Input
                    id="edit-payment-url"
                    value={editForm.payment_url}
                    onChange={(e) => setEditForm({ ...editForm, payment_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                決済リンクを設定すると申込後に自動送信されます。金額を設定するとStripe決済セッションが自動作成されます。
              </p>

              <div>
                <Label htmlFor="edit-zoom-url" className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  ZoomリンクURL
                </Label>
                <Input
                  id="edit-zoom-url"
                  value={editForm.zoom_url}
                  onChange={(e) => setEditForm({ ...editForm, zoom_url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  決済完了後に自動送信されます。無料セミナーの場合は申込後に送信されます。
                </p>
              </div>

              <div>
                <Label htmlFor="edit-zoom-note">Zoom案内の注釈文</Label>
                <textarea
                  id="edit-zoom-note"
                  value={editForm.zoom_note}
                  onChange={(e) => setEditForm({ ...editForm, zoom_note: e.target.value })}
                  placeholder={"例: ボタンで開けない場合は、以下のURLをSafari/Chromeにコピーしてください。\nZoomアプリを事前にインストールしておいてください。"}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  空欄の場合はデフォルトの案内文が使用されます。改行も反映されます。
                </p>
              </div>

              <div>
                <Label htmlFor="edit-post-payment-url">決済後に送るURL（予約ページ等）</Label>
                <Input
                  id="edit-post-payment-url"
                  value={editForm.post_payment_url}
                  onChange={(e) => setEditForm({ ...editForm, post_payment_url: e.target.value })}
                  placeholder="https://timerex.net/... など"
                />
                <p className="text-xs text-gray-400 mt-1">
                  決済完了後にこのURLがLINEで送信されます。Zoomリンクとは別に送れます。
                </p>
              </div>

              <div>
                <Label htmlFor="edit-post-payment-message">決済後URLの案内文</Label>
                <textarea
                  id="edit-post-payment-message"
                  value={editForm.post_payment_message}
                  onChange={(e) => setEditForm({ ...editForm, post_payment_message: e.target.value })}
                  placeholder={"例: 以下のURLからご予約ください。\n詳細はご登録いただくメールよりご確認ください"}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  空欄の場合はデフォルトの案内文が使用されます。改行も反映されます。
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LINE案内送信ダイアログ */}
      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open)
        if (open && tags.length === 0) fetchTags()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>LINE案内送信</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* タグフィルター */}
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">
                <Tag className="h-3 w-3 inline mr-1" />
                タグで絞り込み
              </Label>
              <Select value={selectedTagId} onValueChange={handleTagSelect}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="タグを選択..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: tag.color || "#9CA3AF" }}
                        />
                        {tag.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 名前検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="名前で検索..."
                value={inviteSearch}
                onChange={(e) => searchInviteFriends(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 選択済み */}
            {selectedInvitees.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">選択済み: {selectedInvitees.length}名</span>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setSelectedInvitees([])}
                  >
                    すべて解除
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedInvitees.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full cursor-pointer hover:bg-green-100"
                      onClick={() => toggleInvitee(f)}
                    >
                      {f.custom_name || f.display_name || "名前なし"} ×
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 検索結果 */}
            <div>
              {inviteResults.length > 0 && (
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{inviteResults.length}名</span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={selectAllResults}
                  >
                    すべて選択
                  </button>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchingInvite || loadingByTag ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="ml-2 text-xs text-gray-500">検索中...</span>
                  </div>
                ) : (
                  inviteResults.map((friend) => {
                    const selected = selectedInvitees.some((f) => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
                          selected ? "bg-green-50 border border-green-200" : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleInvitee(friend)}
                      >
                        {friend.picture_url ? (
                          <img src={friend.picture_url} alt="" className="h-8 w-8 rounded-full" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm font-medium flex-1">
                          {friend.custom_name || friend.display_name || "名前なし"}
                        </span>
                        {selected && <span className="text-green-600 text-xs">選択済</span>}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {sendResult && (
              <p className={`text-sm ${sendResult.includes("失敗") ? "text-red-600" : "text-green-600"}`}>
                {sendResult}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              閉じる
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={sending || selectedInvitees.length === 0}
            >
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedInvitees.length}名に送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 参加者追加ダイアログ */}
      <Dialog open={addAttendeeOpen} onOpenChange={setAddAttendeeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>参加者を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="友だちを検索..."
                value={friendSearch}
                onChange={(e) => searchFriends(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchingFriends ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-xs text-gray-500">検索中...</span>
                </div>
              ) : friendResults.length === 0 && friendSearch ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  該当する友だちが見つかりません
                </p>
              ) : (
                friendResults.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors text-left"
                    onClick={() => addAttendee(friend.id)}
                  >
                    {friend.picture_url ? (
                      <img
                        src={friend.picture_url}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium">{friend.custom_name || friend.display_name || "名前なし"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
