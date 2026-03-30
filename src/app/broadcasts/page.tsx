"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Send,
  History,
  Eye,
  Loader2,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Megaphone,
} from "lucide-react"

interface TagData {
  id: string
  name: string
  color: string
}

interface SeminarData {
  id: string
  title: string
}

interface BroadcastData {
  id: string
  title: string
  message_text: string
  target_type: string
  target_filter: Record<string, unknown>
  status: "draft" | "sending" | "sent" | "failed"
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft: {
    label: "下書き",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
  sending: {
    label: "送信中",
    variant: "secondary",
    icon: <Radio className="h-3 w-3" />,
  },
  sent: {
    label: "送信済み",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "失敗",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  all: "全員配信",
  tag: "タグ指定",
  seminar: "セミナー参加者",
}

const MAX_MESSAGE_LENGTH = 5000

export default function BroadcastsPage() {
  const accentColor = useAccentColor()
  const [activeTab, setActiveTab] = useState("create")

  // Create form state
  const [title, setTitle] = useState("")
  const [messageText, setMessageText] = useState("")
  const [targetType, setTargetType] = useState("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSeminarId, setSelectedSeminarId] = useState("")
  const [tags, setTags] = useState<TagData[]>([])
  const [seminars, setSeminars] = useState<SeminarData[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // History state
  const [broadcasts, setBroadcasts] = useState<BroadcastData[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      const json = await res.json()
      setTags(json.data ?? [])
    } catch {
      console.error("タグの取得に失敗しました")
    }
  }, [])

  const fetchSeminars = useCallback(async () => {
    try {
      const res = await fetch("/api/seminars")
      const json = await res.json()
      setSeminars(json.data ?? [])
    } catch {
      console.error("セミナーの取得に失敗しました")
    }
  }, [])

  const fetchBroadcasts = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/broadcasts")
      const json = await res.json()
      setBroadcasts(json.data ?? [])
    } catch {
      console.error("配信履歴の取得に失敗しました")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
    fetchSeminars()
  }, [fetchTags, fetchSeminars])

  useEffect(() => {
    if (activeTab === "history") {
      fetchBroadcasts()
    }
  }, [activeTab, fetchBroadcasts])

  const buildTargetFilter = () => {
    if (targetType === "tag") return { tagIds: selectedTagIds }
    if (targetType === "seminar") return { seminarId: selectedSeminarId }
    return {}
  }

  const handlePreview = async () => {
    setPreviewing(true)
    setPreviewCount(null)
    try {
      const res = await fetch("/api/broadcasts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetFilter: buildTargetFilter(),
        }),
      })
      const json = await res.json()
      setPreviewCount(json.count ?? 0)
    } catch {
      console.error("プレビューの取得に失敗しました")
    } finally {
      setPreviewing(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          messageText,
          targetType,
          targetFilter: buildTargetFilter(),
        }),
      })
      if (res.ok) {
        setConfirmOpen(false)
        setTitle("")
        setMessageText("")
        setTargetType("all")
        setSelectedTagIds([])
        setSelectedSeminarId("")
        setPreviewCount(null)
        setActiveTab("history")
      }
    } catch {
      console.error("配信の送信に失敗しました")
    } finally {
      setSending(false)
    }
  }

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const canSend =
    title.trim() &&
    messageText.trim() &&
    messageText.length <= MAX_MESSAGE_LENGTH &&
    (targetType === "all" ||
      (targetType === "tag" && selectedTagIds.length > 0) ||
      (targetType === "seminar" && selectedSeminarId))

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AppLayout>
      <PageHeader
        title="配信管理"
        description="LINE友だちへのメッセージ一斉配信を管理します"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create" className="gap-1.5">
            <Send className="h-4 w-4" />
            新規配信
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            配信履歴
          </TabsTrigger>
        </TabsList>

        {/* 新規配信タブ */}
        <TabsContent value="create">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">メッセージ作成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* タイトル */}
              <div className="space-y-2">
                <Label htmlFor="broadcast-title">配信タイトル</Label>
                <Input
                  id="broadcast-title"
                  placeholder="例: 年末キャンペーンのお知らせ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* メッセージ */}
              <div className="space-y-2">
                <Label htmlFor="broadcast-message">メッセージ本文</Label>
                <Textarea
                  id="broadcast-message"
                  placeholder="配信するメッセージを入力してください..."
                  rows={6}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <div className="flex justify-end">
                  <span
                    className={`text-xs ${
                      messageText.length > MAX_MESSAGE_LENGTH
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {messageText.length} / {MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              </div>

              {/* 配信対象 */}
              <div className="space-y-2">
                <Label>配信対象</Label>
                <Select value={targetType} onValueChange={(v) => {
                  setTargetType(v)
                  setPreviewCount(null)
                }}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員配信</SelectItem>
                    <SelectItem value="tag">タグ指定</SelectItem>
                    <SelectItem value="seminar">セミナー参加者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* タグ選択 */}
              {targetType === "tag" && (
                <div className="space-y-2">
                  <Label>タグを選択（複数可）</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        タグがまだ作成されていません
                      </p>
                    ) : (
                      tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTagSelection(tag.id)}
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all border-2 ${
                            selectedTagIds.includes(tag.id)
                              ? "border-gray-900 shadow-sm"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                          style={{
                            backgroundColor: tag.color,
                            color: "white",
                          }}
                        >
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* セミナー選択 */}
              {targetType === "seminar" && (
                <div className="space-y-2">
                  <Label>セミナーを選択</Label>
                  <Select
                    value={selectedSeminarId}
                    onValueChange={setSelectedSeminarId}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="セミナーを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {seminars.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                          セミナーがありません
                        </SelectItem>
                      ) : (
                        seminars.map((seminar) => (
                          <SelectItem key={seminar.id} value={seminar.id}>
                            {seminar.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* プレビュー結果 */}
              {previewCount !== null && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    配信対象: <strong>{previewCount}人</strong>
                  </span>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewing}
                >
                  {previewing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  プレビュー
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSend}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  配信する
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配信履歴タブ */}
        <TabsContent value="history">
          <Card className="mt-4">
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    読み込み中...
                  </span>
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Megaphone className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">
                    配信履歴はまだありません
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>配信対象</TableHead>
                      <TableHead className="text-right">送信数</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>送信日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((broadcast) => {
                      const statusConfig =
                        STATUS_CONFIG[broadcast.status] ?? STATUS_CONFIG.draft
                      return (
                        <TableRow key={broadcast.id}>
                          <TableCell className="font-medium">
                            {broadcast.title}
                          </TableCell>
                          <TableCell>
                            {TARGET_TYPE_LABELS[broadcast.target_type] ??
                              broadcast.target_type}
                          </TableCell>
                          <TableCell className="text-right">
                            {broadcast.sent_count.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusConfig.variant}
                              className="gap-1"
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatDateTime(broadcast.sent_at)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 送信確認ダイアログ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配信確認</DialogTitle>
            <DialogDescription>
              以下の内容でメッセージを配信します。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-20">タイトル:</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-20">配信対象:</span>
              <span>{TARGET_TYPE_LABELS[targetType] ?? targetType}</span>
            </div>
            {previewCount !== null && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0 w-20">対象人数:</span>
                <span>{previewCount}人</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">メッセージ:</span>
              <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap text-gray-700">
                {messageText}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              キャンセル
            </Button>
            <Button onClick={handleSend} disabled={sending} style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              配信する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
