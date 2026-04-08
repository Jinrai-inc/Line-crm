"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/ui/file-dropzone"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Tag,
  Gift,
  Send,
  CheckCircle2,
  GripVertical,
  Pencil,
  Copy,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

interface UploadedFile {
  url: string
  fileName: string
  fileSize: number
  mimeType: string
}

interface Choice {
  text: string
  tagName: string
  rewardMessage: string
  rewardUrl: string
  file?: UploadedFile | null
  fileLink?: string
  autoReplyMessage?: string
  nextQuestionIndex?: number // -1 = アンケート終了, undefined = 次の質問へ
}

interface Question {
  label: string
  choices: Choice[]
  hasReward: boolean
}

interface SurveyData {
  id: string
  title: string
  questions: string | Question[]
  status: string
  enabled: boolean
  created_at: string
  updated_at: string
}

const emptyChoice: Choice = { text: "", tagName: "", rewardMessage: "", rewardUrl: "", file: null, fileLink: "", autoReplyMessage: "", nextQuestionIndex: undefined }

export default function SurveysPage() {
  const accentColor = useAccentColor()
  const [surveys, setSurveys] = useState<SurveyData[]>([])
  const [loading, setLoading] = useState(true)

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null)
  const [title, setTitle] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendingSurvey, setSendingSurvey] = useState<SurveyData | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedCount: number } | null>(null)
  const [sendTargetType, setSendTargetType] = useState("all")
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [seminars, setSeminars] = useState<{ id: string; title: string }[]>([])
  const [selectedSeminarId, setSelectedSeminarId] = useState("")

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/surveys")
      const json = await res.json()
      setSurveys(json.data ?? [])
    } catch {
      console.error("アンケートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  // Fetch tags & seminars for send dialog
  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((j) => setTags(j.data ?? [])).catch(() => {})
    fetch("/api/seminars").then((r) => r.json()).then((j) => setSeminars(j.data ?? [])).catch(() => {})
  }, [])

  function openCreateEditor() {
    setEditingSurvey(null)
    setTitle("")
    setQuestions([{ label: "", choices: [{ ...emptyChoice }, { ...emptyChoice }], hasReward: false }])
    setSaved(false)
    setEditorOpen(true)
  }

  function openEditEditor(survey: SurveyData) {
    setEditingSurvey(survey)
    setTitle(survey.title)
    const raw = typeof survey.questions === "string"
      ? JSON.parse(survey.questions)
      : survey.questions || []
    // 既存データに hasReward がない場合はデフォルト値を設定
    const parsed = raw.map((q: Question) => ({
      ...q,
      hasReward: q.hasReward ?? (q.choices?.some((c: Choice) => c.rewardMessage || c.rewardUrl) || false),
      choices: (q.choices || []).map((c: Choice) => ({
        ...c,
        file: c.file || null,
        fileLink: c.fileLink || "",
        autoReplyMessage: c.autoReplyMessage || "",
        nextQuestionIndex: c.nextQuestionIndex,
      })),
    }))
    setQuestions(parsed)
    setSaved(false)
    setEditorOpen(true)
  }

  async function handleSave(status: "draft" | "published") {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (editingSurvey) {
        const res = await fetch(`/api/surveys/${editingSurvey.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, questions, status }),
        })
        if (res.ok) {
          const json = await res.json()
          setEditingSurvey(json.data)
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          setToast({ type: "success", message: "アンケートを保存しました" })
          fetchSurveys()
        } else {
          const json = await res.json().catch(() => ({}))
          setToast({ type: "error", message: json.error || "保存に失敗しました" })
        }
      } else {
        const res = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, questions, status }),
        })
        if (res.ok) {
          const json = await res.json()
          setEditingSurvey(json.data)
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          setToast({ type: "success", message: "アンケートを作成しました" })
          fetchSurveys()
        } else {
          const json = await res.json().catch(() => ({}))
          setToast({ type: "error", message: json.error || "作成に失敗しました" })
        }
      }
    } catch {
      setToast({ type: "error", message: "保存に失敗しました。ネットワーク接続を確認してください。" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このアンケートを削除しますか？")) return
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" })
      if (res.ok) {
        setToast({ type: "success", message: "アンケートを削除しました" })
        fetchSurveys()
      } else {
        const json = await res.json().catch(() => ({}))
        setToast({ type: "error", message: json.error || "削除に失敗しました" })
      }
    } catch {
      setToast({ type: "error", message: "削除に失敗しました" })
    }
  }

  function openSendDialog(survey: SurveyData) {
    setSendingSurvey(survey)
    setSendResult(null)
    setSendTargetType("all")
    setSelectedTagIds([])
    setSelectedSeminarId("")
    setSendDialogOpen(true)
  }

  async function handleSend() {
    if (!sendingSurvey) return
    setSending(true)
    setSendResult(null)
    try {
      const body: Record<string, unknown> = { targetType: sendTargetType }
      if (sendTargetType === "tag") {
        body.targetFilter = { tagIds: selectedTagIds }
      } else if (sendTargetType === "seminar") {
        body.targetFilter = { seminarId: selectedSeminarId }
      }

      const res = await fetch(`/api/surveys/${sendingSurvey.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const json = await res.json()
        setSendResult(json)
        fetchSurveys()
      }
    } catch {
      console.error("送信に失敗しました")
    } finally {
      setSending(false)
    }
  }

  // Question CRUD
  function addQuestion() {
    setQuestions([...questions, { label: "", choices: [{ ...emptyChoice }, { ...emptyChoice }], hasReward: false }])
  }
  function removeQuestion(qIdx: number) {
    setQuestions(questions.filter((_, i) => i !== qIdx))
  }
  function updateQuestionLabel(qIdx: number, label: string) {
    setQuestions(questions.map((q, i) => (i === qIdx ? { ...q, label } : q)))
  }
  function addChoice(qIdx: number) {
    setQuestions(questions.map((q, i) => i === qIdx ? { ...q, choices: [...q.choices, { ...emptyChoice }] } : q))
  }
  function removeChoice(qIdx: number, cIdx: number) {
    setQuestions(questions.map((q, i) => i === qIdx ? { ...q, choices: q.choices.filter((_, ci) => ci !== cIdx) } : q))
  }
  function updateChoice(qIdx: number, cIdx: number, field: keyof Choice, value: string) {
    setQuestions(questions.map((q, i) =>
      i === qIdx ? { ...q, choices: q.choices.map((c, ci) => ci === cIdx ? { ...c, [field]: value } : c) } : q
    ))
  }
  function updateChoiceFile(qIdx: number, cIdx: number, file: UploadedFile | null) {
    setQuestions(questions.map((q, i) =>
      i === qIdx ? { ...q, choices: q.choices.map((c, ci) => ci === cIdx ? { ...c, file } : c) } : q
    ))
  }
  function toggleHasReward(qIdx: number) {
    setQuestions(questions.map((q, i) => i === qIdx ? { ...q, hasReward: !q.hasReward } : q))
  }

  function getQuestionCount(survey: SurveyData): number {
    const q = typeof survey.questions === "string" ? JSON.parse(survey.questions) : survey.questions || []
    return q.length
  }

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: "下書き", color: "bg-gray-100 text-gray-700" },
    published: { label: "送信済み", color: "bg-green-100 text-green-700" },
  }

  return (
    <AppLayout>
      <PageHeader
        title="アンケート"
        description="アンケートの作成・管理・送信"
        action={
          <Button
            onClick={openCreateEditor}
            style={{ backgroundColor: accentColor }}
            className="text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        }
      />

      {/* アンケート一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">アンケートがありません</p>
            <p className="text-xs text-gray-400 mb-4">新規作成してアンケートを準備しましょう</p>
            <Button variant="outline" onClick={openCreateEditor}>
              <Plus className="h-4 w-4 mr-2" />
              最初のアンケートを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => {
            const status = STATUS_MAP[survey.status] || STATUS_MAP.draft
            const qCount = getQuestionCount(survey)
            return (
              <Card key={survey.id} className="group hover:border-gray-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{survey.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${status.color} border-transparent`}>{status.label}</Badge>
                        <span className="text-xs text-gray-400">{qCount}問</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    作成: {new Date(survey.created_at).toLocaleDateString("ja-JP")}
                    {survey.updated_at !== survey.created_at && (
                      <> ・ 更新: {new Date(survey.updated_at).toLocaleDateString("ja-JP")}</>
                    )}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => openEditEditor(survey)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      編集
                    </Button>
                    {survey.status === "published" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        asChild
                      >
                        <Link href={`/surveys/${survey.id}`}>
                          <BarChart3 className="h-3 w-3 mr-1" />
                          結果
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs text-white hover:opacity-90"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => openSendDialog(survey)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        送信
                      </Button>
                    )}
                    {survey.status === "published" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openSendDialog(survey)}
                        title="再送信"
                      >
                        <Send className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(survey.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* アンケート編集ダイアログ */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSurvey ? "アンケートを編集" : "新規アンケート作成"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* タイトル */}
            <div className="space-y-2">
              <Label>アンケートタイトル *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: お客様満足度アンケート"
              />
            </div>

            {/* 質問一覧 */}
            {questions.map((question, qIdx) => (
              <Card key={qIdx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: accentColor }}>
                      <ClipboardList className="h-4 w-4" />
                      質問 {qIdx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Input
                    value={question.label}
                    onChange={(e) => updateQuestionLabel(qIdx, e.target.value)}
                    placeholder="例: あなたの性別を教えてください"
                  />

                  {/* 特典トグル */}
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-xs flex items-center gap-1.5 text-gray-600">
                      <Gift className="h-3.5 w-3.5" />
                      特典を付ける
                    </Label>
                    <Switch
                      checked={question.hasReward}
                      onCheckedChange={() => toggleHasReward(qIdx)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-500">選択肢</Label>
                      <Button variant="outline" size="sm" onClick={() => addChoice(qIdx)} className="h-6 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        追加
                      </Button>
                    </div>

                    {question.choices.map((choice, cIdx) => (
                      <div key={cIdx} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">選択肢 {cIdx + 1}</Badge>
                          {question.choices.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChoice(qIdx, cIdx)}
                              className="text-red-400 hover:text-red-600 h-6 px-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">テキスト *</Label>
                            <Input
                              value={choice.text}
                              onChange={(e) => updateChoice(qIdx, cIdx, "text", e.target.value)}
                              placeholder="例: 男性"
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <Tag className="h-3 w-3" />自動タグ
                            </Label>
                            <Input
                              value={choice.tagName}
                              onChange={(e) => updateChoice(qIdx, cIdx, "tagName", e.target.value)}
                              placeholder="例: 男性"
                              className="h-8"
                            />
                          </div>
                        </div>

                        {/* 自動返信メッセージ */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            💬 自動返信メッセージ
                          </Label>
                          <Input
                            value={choice.autoReplyMessage || ""}
                            onChange={(e) => updateChoice(qIdx, cIdx, "autoReplyMessage", e.target.value)}
                            placeholder="この選択肢が選ばれた時に返信するメッセージ（任意）"
                            className="h-8"
                          />
                        </div>

                        {/* 条件分岐（質問が2つ以上の場合のみ表示） */}
                        {questions.length > 1 && (
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              🔀 次の質問（分岐）
                            </Label>
                            <select
                              value={choice.nextQuestionIndex === undefined ? "" : String(choice.nextQuestionIndex)}
                              onChange={(e) => {
                                const val = e.target.value
                                setQuestions(questions.map((q, qi) =>
                                  qi === qIdx ? {
                                    ...q,
                                    choices: q.choices.map((c, ci) =>
                                      ci === cIdx ? { ...c, nextQuestionIndex: val === "" ? undefined : parseInt(val) } : c
                                    )
                                  } : q
                                ))
                              }}
                              className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                            >
                              <option value="">次の質問へ（順番通り）</option>
                              {questions.map((q, qi) =>
                                qi !== qIdx && (
                                  <option key={qi} value={qi}>
                                    質問{qi + 1}へ: {q.label || "(未入力)"}
                                  </option>
                                )
                              )}
                              <option value="-1">アンケート終了</option>
                            </select>
                          </div>
                        )}

                        {/* ファイル添付 */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />添付ファイル
                          </Label>
                          <FileDropzone
                            onUpload={(file) => updateChoiceFile(qIdx, cIdx, file)}
                            onRemove={() => updateChoiceFile(qIdx, cIdx, null)}
                            uploadedFile={choice.file}
                            accentColor={accentColor}
                          />
                        </div>

                        {/* 画像リンク（画像がアップ済みの場合のみ表示） */}
                        {choice.file && choice.file.mimeType.startsWith("image/") && (
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />画像リンクURL
                            </Label>
                            <Input
                              value={choice.fileLink || ""}
                              onChange={(e) => updateChoice(qIdx, cIdx, "fileLink", e.target.value)}
                              placeholder="画像タップ時のリンク先URL（任意）"
                              className="h-8"
                            />
                          </div>
                        )}

                        {/* 特典（トグルONのときのみ表示） */}
                        {question.hasReward && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Gift className="h-3 w-3" />特典メッセージ
                              </Label>
                              <Input
                                value={choice.rewardMessage}
                                onChange={(e) => updateChoice(qIdx, cIdx, "rewardMessage", e.target.value)}
                                placeholder="選択後に送るメッセージ（任意）"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">特典ファイルURL</Label>
                              <Input
                                value={choice.rewardUrl}
                                onChange={(e) => updateChoice(qIdx, cIdx, "rewardUrl", e.target.value)}
                                placeholder="https://..."
                                className="h-8"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 質問追加 */}
            <button
              type="button"
              onClick={addQuestion}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
            >
              <Plus className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">質問を追加</p>
            </button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 mr-auto">
                <CheckCircle2 className="h-4 w-4" />
                保存しました
              </span>
            )}
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              閉じる
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={!title.trim() || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              下書き保存
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={!title.trim() || saving}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 送信ダイアログ */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アンケートを送信</DialogTitle>
          </DialogHeader>

          {sendResult ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">{sendResult.sentCount}件に送信しました</p>
              {sendResult.failedCount > 0 && (
                <p className="text-sm text-red-500 mt-1">{sendResult.failedCount}件失敗</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{sendingSurvey?.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sendingSurvey && getQuestionCount(sendingSurvey)}問
                </p>
              </div>

              <div className="space-y-2">
                <Label>送信先</Label>
                <Select value={sendTargetType} onValueChange={setSendTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員</SelectItem>
                    <SelectItem value="tag">タグで絞り込み</SelectItem>
                    <SelectItem value="seminar">セミナー参加者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sendTargetType === "tag" && (
                <div className="space-y-2">
                  <Label>タグを選択</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          selectedTagIds.includes(tag.id)
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sendTargetType === "seminar" && (
                <div className="space-y-2">
                  <Label>セミナーを選択</Label>
                  <Select value={selectedSeminarId} onValueChange={setSelectedSeminarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="セミナーを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {seminars.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {sendResult ? (
              <Button onClick={() => { setSendDialogOpen(false); setSendResult(null) }}>
                閉じる
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sending}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || (sendTargetType === "tag" && selectedTagIds.length === 0) || (sendTargetType === "seminar" && !selectedSeminarId)}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90"
                >
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  送信する
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {toast.message}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
