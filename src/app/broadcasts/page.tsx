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
import { FileDropzone } from "@/components/ui/file-dropzone"
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
  Image as ImageIcon,
  FileText,
  Video,
  ClipboardList,
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

interface SurveyData {
  seminar_id: string
  title: string
  questions: string
  enabled: boolean
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
  const [messageType, setMessageType] = useState<"text" | "image" | "video" | "survey">("text")
  const [messageText, setMessageText] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [previewImageUrl, setPreviewImageUrl] = useState("")
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: number; mimeType: string } | null>(null)
  const [targetType, setTargetType] = useState("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSeminarId, setSelectedSeminarId] = useState("")
  const [tags, setTags] = useState<TagData[]>([])
  const [seminars, setSeminars] = useState<SeminarData[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState("")
  const [surveys, setSurveys] = useState<(SurveyData & { seminarTitle: string })[]>([])
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

  const fetchSurveys = useCallback(async () => {
    try {
      const semRes = await fetch("/api/seminars")
      const semJson = await semRes.json()
      const semList = semJson.data ?? []
      const surveyList: (SurveyData & { seminarTitle: string })[] = []
      for (const sem of semList) {
        try {
          const res = await fetch(`/api/seminars/${sem.id}/survey`)
          const json = await res.json()
          if (json.data && json.data.enabled) {
            const q = typeof json.data.questions === "string"
              ? JSON.parse(json.data.questions)
              : json.data.questions || []
            if (q.length > 0) {
              surveyList.push({ ...json.data, seminar_id: sem.id, seminarTitle: sem.title })
            }
          }
        } catch { /* skip */ }
      }
      setSurveys(surveyList)
    } catch {
      console.error("アンケート一覧の取得に失敗しました")
    }
  }, [])

  useEffect(() => {
    fetchTags()
    fetchSeminars()
    fetchSurveys()
  }, [fetchTags, fetchSeminars, fetchSurveys])

  useEffect(() => {
    if (activeTab === "history") {
      fetchBroadcasts()
    }
  }, [activeTab, fetchBroadcasts])

  const resetForm = () => {
    setTitle("")
    setMessageType("text")
    setMessageText("")
    setImageUrl("")
    setPreviewImageUrl("")
    setUploadedFile(null)
    setTargetType("all")
    setSelectedTagIds([])
    setSelectedSeminarId("")
    setSelectedSurveyId("")
    setPreviewCount(null)
  }

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
      if (messageType === "survey") {
        // アンケート配信はアンケート送信APIを使う
        const survey = surveys.find((s) => s.seminar_id === selectedSurveyId)
        if (!survey) return

        const res = await fetch(`/api/seminars/${selectedSurveyId}/survey/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType,
            targetFilter: buildTargetFilter(),
          }),
        })
        if (res.ok) {
          setConfirmOpen(false)
          resetForm()
          setActiveTab("history")
        }
      } else {
        const res = await fetch("/api/broadcasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            messageType: messageType === "text" && imageUrl ? "image" : messageType,
            messageText,
            imageUrl: imageUrl || undefined,
            previewImageUrl: previewImageUrl || undefined,
            targetType,
            targetFilter: buildTargetFilter(),
          }),
        })
        if (res.ok) {
          setConfirmOpen(false)
          resetForm()
          setActiveTab("history")
        }
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

  const hasContent = messageType === "text"
    ? messageText.trim() && messageText.length <= MAX_MESSAGE_LENGTH
    : messageType === "survey"
    ? !!selectedSurveyId
    : imageUrl.trim()

  const canSend =
    (messageType === "survey" ? !!selectedSurveyId : title.trim()) &&
    hasContent &&
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

              {/* メッセージ種別 */}
              <div className="space-y-2">
                <Label>メッセージ種別</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "text" as const, label: "テキスト", icon: FileText },
                    { value: "image" as const, label: "画像", icon: ImageIcon },
                    { value: "video" as const, label: "動画", icon: Video },
                    { value: "survey" as const, label: "アンケート", icon: ClipboardList },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMessageType(value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        messageType === value
                          ? "border-current shadow-sm"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                      style={messageType === value ? { color: accentColor, borderColor: accentColor } : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* テキストメッセージ */}
              {messageType === "text" && (
                <div className="space-y-4">
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

                  {/* ファイル添付（テキスト配信時） */}
                  <div className="space-y-2">
                    <Label>ファイル添付（任意）</Label>
                    <FileDropzone
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      maxSizeMB={10}
                      accentColor={accentColor}
                      uploadedFile={uploadedFile}
                      onUpload={(file) => {
                        setUploadedFile(file)
                        setImageUrl(file.url)
                      }}
                      onRemove={() => {
                        setUploadedFile(null)
                        setImageUrl("")
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      画像やPDFを添付するとテキストと一緒に配信されます
                    </p>
                  </div>
                </div>
              )}

              {/* 画像・動画メッセージ */}
              {(messageType === "image" || messageType === "video") && (
                <div className="space-y-4">
                  {/* ドラッグ＆ドロップアップロード */}
                  <div className="space-y-2">
                    <Label>
                      {messageType === "image" ? "画像ファイル" : "動画ファイル"}
                    </Label>
                    <FileDropzone
                      accept={
                        messageType === "image"
                          ? "image/jpeg,image/png,image/gif,image/webp"
                          : "video/mp4"
                      }
                      maxSizeMB={messageType === "image" ? 10 : 200}
                      accentColor={accentColor}
                      uploadedFile={uploadedFile}
                      onUpload={(file) => {
                        setUploadedFile(file)
                        setImageUrl(file.url)
                        setPreviewImageUrl("")
                      }}
                      onRemove={() => {
                        setUploadedFile(null)
                        setImageUrl("")
                        setPreviewImageUrl("")
                      }}
                    />
                  </div>

                  {/* URL直接入力（折りたたみ） */}
                  {!uploadedFile && (
                    <details className="group">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                        URLを直接入力する場合はこちら
                      </summary>
                      <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-200">
                        <div className="space-y-1.5">
                          <Label htmlFor="media-url" className="text-xs">
                            {messageType === "image" ? "画像URL" : "動画URL"}
                          </Label>
                          <Input
                            id="media-url"
                            placeholder={messageType === "image" ? "https://example.com/image.jpg" : "https://example.com/video.mp4"}
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="preview-url" className="text-xs">
                            プレビュー画像URL（任意）
                          </Label>
                          <Input
                            id="preview-url"
                            placeholder="https://example.com/preview.jpg"
                            value={previewImageUrl}
                            onChange={(e) => setPreviewImageUrl(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </details>
                  )}

                  {/* テキスト付与オプション */}
                  <div className="space-y-2">
                    <Label htmlFor="broadcast-message-with-media">
                      添付テキスト（任意）
                    </Label>
                    <Textarea
                      id="broadcast-message-with-media"
                      placeholder="画像と一緒に送信するテキストメッセージ..."
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      入力するとメディアとテキストが一緒に配信されます
                    </p>
                  </div>
                </div>
              )}

              {/* アンケート選択 */}
              {messageType === "survey" && (
                <div className="space-y-2">
                  <Label>送信するアンケート</Label>
                  {surveys.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                      <ClipboardList className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">アンケートが作成されていません</p>
                      <p className="text-xs text-gray-400 mt-1">セミナー詳細画面からアンケートを作成してください</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {surveys.map((survey) => {
                        const questions = typeof survey.questions === "string"
                          ? JSON.parse(survey.questions)
                          : survey.questions || []
                        const isSelected = selectedSurveyId === survey.seminar_id
                        return (
                          <button
                            key={survey.seminar_id}
                            type="button"
                            onClick={() => {
                              setSelectedSurveyId(survey.seminar_id)
                              if (!title) setTitle(`${survey.seminarTitle} - ${survey.title}`)
                            }}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-current shadow-sm bg-green-50/50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            style={isSelected ? { borderColor: accentColor } : undefined}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{survey.seminarTitle}</span>
                              <Badge variant="secondary" className="text-xs">{questions.length}問</Badge>
                            </div>
                            <p className="text-xs text-gray-500">{survey.title}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

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
            {messageType === "survey" && selectedSurveyId && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0 w-20">種別:</span>
                <span>アンケート配信</span>
              </div>
            )}
            {imageUrl && (
              <div>
                <span className="text-gray-500">添付ファイル:</span>
                {uploadedFile?.mimeType?.startsWith("image/") ? (
                  <div className="mt-1 max-w-[200px]">
                    <img src={imageUrl} alt="配信画像" className="rounded-lg max-h-32 object-contain" />
                  </div>
                ) : uploadedFile ? (
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-xs text-gray-600">
                    {uploadedFile.fileName}
                  </div>
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-xs text-gray-600 truncate">
                    {imageUrl}
                  </div>
                )}
              </div>
            )}
            {messageText && (
              <div>
                <span className="text-gray-500">メッセージ:</span>
                <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap text-gray-700">
                  {messageText}
                </div>
              </div>
            )}
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
