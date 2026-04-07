"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { FileDropzone } from "@/components/ui/file-dropzone"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAccentColor } from "@/hooks/use-accent-color"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Tag,
  Gift,
  Send,
  CheckCircle2,
  GripVertical,
} from "lucide-react"

interface Choice {
  text: string
  tagName: string
  rewardMessage: string
  rewardUrl: string
}

interface Question {
  label: string
  choices: Choice[]
}

const emptyChoice: Choice = { text: "", tagName: "", rewardMessage: "", rewardUrl: "" }

export default function SeminarSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const accentColor = useAccentColor()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [title, setTitle] = useState("アンケート")
  const [questions, setQuestions] = useState<Question[]>([])
  const [seminarTitle, setSeminarTitle] = useState("")

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedCount: number } | null>(null)

  const fetchSurvey = useCallback(async () => {
    try {
      setLoading(true)
      const [surveyRes, seminarRes] = await Promise.all([
        fetch(`/api/seminars/${id}/survey`),
        fetch(`/api/seminars/${id}`),
      ])
      const surveyJson = await surveyRes.json()
      const seminarJson = await seminarRes.json()

      if (surveyJson.data) {
        setEnabled(surveyJson.data.enabled ?? true)
        setTitle(surveyJson.data.title ?? "アンケート")
        const parsed = typeof surveyJson.data.questions === "string"
          ? JSON.parse(surveyJson.data.questions)
          : surveyJson.data.questions || []
        setQuestions(parsed)
      }
      if (seminarJson.data) {
        setSeminarTitle(seminarJson.data.title ?? "")
      }
    } catch {
      console.error("アンケートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchSurvey()
  }, [id, fetchSurvey])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/seminars/${id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions, enabled }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      console.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  async function handleSend() {
    setSending(true)
    setSendResult(null)
    try {
      // Save first
      await fetch(`/api/seminars/${id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions, enabled: true }),
      })
      // Then send
      const res = await fetch(`/api/seminars/${id}/survey/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const json = await res.json()
        setSendResult(json)
      }
    } catch {
      console.error("送信に失敗しました")
    } finally {
      setSending(false)
    }
  }

  // Question CRUD
  function addQuestion() {
    setQuestions([...questions, { label: "", choices: [{ ...emptyChoice }, { ...emptyChoice }] }])
  }

  function removeQuestion(qIdx: number) {
    setQuestions(questions.filter((_, i) => i !== qIdx))
  }

  function updateQuestionLabel(qIdx: number, label: string) {
    setQuestions(questions.map((q, i) => (i === qIdx ? { ...q, label } : q)))
  }

  function addChoice(qIdx: number) {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx ? { ...q, choices: [...q.choices, { ...emptyChoice }] } : q
      )
    )
  }

  function removeChoice(qIdx: number, cIdx: number) {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx ? { ...q, choices: q.choices.filter((_, ci) => ci !== cIdx) } : q
      )
    )
  }

  function updateChoice(qIdx: number, cIdx: number, field: keyof Choice, value: string) {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              choices: q.choices.map((c, ci) =>
                ci === cIdx ? { ...c, [field]: value } : c
              ),
            }
          : q
      )
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="アンケート設定"
        description={seminarTitle ? `「${seminarTitle}」参加者向けアンケート` : "セミナー参加者向けアンケート"}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            {questions.length > 0 && (
              <Button
                onClick={() => setSendDialogOpen(true)}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                <Send className="h-4 w-4 mr-2" />
                参加者に送信
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6 max-w-3xl">
        {/* 基本設定 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">アンケートを有効にする</p>
                <p className="text-sm text-gray-500">回答に応じて自動タグ付与・特典配信ができます</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-2">
              <Label>アンケートタイトル</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: セミナー参加後アンケート"
              />
            </div>
          </CardContent>
        </Card>

        {/* 質問一覧 */}
        {questions.map((question, qIdx) => (
          <Card key={qIdx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" style={{ color: accentColor }} />
                  質問 {qIdx + 1}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(qIdx)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>質問文</Label>
                <Input
                  value={question.label}
                  onChange={(e) => updateQuestionLabel(qIdx, e.target.value)}
                  placeholder="例: あなたの性別を教えてください"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">選択肢</Label>
                  <Button variant="outline" size="sm" onClick={() => addChoice(qIdx)} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    選択肢を追加
                  </Button>
                </div>

                {question.choices.map((choice, cIdx) => (
                  <div key={cIdx} className="border rounded-xl p-4 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-300" />
                        <Badge variant="secondary" className="text-xs">選択肢 {cIdx + 1}</Badge>
                      </div>
                      {question.choices.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChoice(qIdx, cIdx)}
                          className="text-red-400 hover:text-red-600 h-6 px-1.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">選択肢テキスト *</Label>
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(qIdx, cIdx, "text", e.target.value)}
                          placeholder="例: 男性"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          自動付与タグ
                        </Label>
                        <Input
                          value={choice.tagName}
                          onChange={(e) => updateChoice(qIdx, cIdx, "tagName", e.target.value)}
                          placeholder="例: 男性"
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* 特典設定 */}
                    <div className="border-t pt-3 mt-2 space-y-3">
                      <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        この選択肢を選んだ方への特典
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">特典メッセージ</Label>
                        <Input
                          value={choice.rewardMessage}
                          onChange={(e) => updateChoice(qIdx, cIdx, "rewardMessage", e.target.value)}
                          placeholder="例: 男性向け特典をお送りします！"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">特典ファイル（PDF・画像など）</Label>
                        <FileDropzone
                          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                          maxSizeMB={10}
                          accentColor={accentColor}
                          uploadedFile={
                            choice.rewardUrl
                              ? {
                                  url: choice.rewardUrl,
                                  fileName: choice.rewardUrl.split("/").pop() || "ファイル",
                                  fileSize: 0,
                                  mimeType: choice.rewardUrl.endsWith(".pdf")
                                    ? "application/pdf"
                                    : "image/jpeg",
                                }
                              : null
                          }
                          onUpload={(file) =>
                            updateChoice(qIdx, cIdx, "rewardUrl", file.url)
                          }
                          onRemove={() => updateChoice(qIdx, cIdx, "rewardUrl", "")}
                        />
                        <details className="mt-1">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                            URLを直接入力
                          </summary>
                          <Input
                            value={choice.rewardUrl}
                            onChange={(e) => updateChoice(qIdx, cIdx, "rewardUrl", e.target.value)}
                            placeholder="https://example.com/reward.pdf"
                            className="h-8 mt-1.5 text-xs"
                          />
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 質問追加ボタン */}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
        >
          <Plus className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">質問を追加</p>
          <p className="text-xs text-gray-400 mt-0.5">例: 性別、職業、仲人かどうか等</p>
        </button>

        {/* 保存ボタン */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              保存しました
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: accentColor }}
            className="text-white hover:opacity-90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            設定を保存
          </Button>
        </div>
      </div>

      {/* 送信確認ダイアログ */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アンケートを送信</DialogTitle>
          </DialogHeader>
          {sendResult ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">{sendResult.sentCount}件に送信しました</p>
              {sendResult.failedCount > 0 && (
                <p className="text-sm text-red-500 mt-1">{sendResult.failedCount}件失敗</p>
              )}
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-gray-600">
                セミナー「{seminarTitle}」の参加者全員にアンケートを送信します。
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500">送信内容:</p>
                <p className="text-sm font-medium mt-1">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{questions.length}問・{questions.reduce((sum, q) => sum + q.choices.length, 0)}選択肢</p>
              </div>
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
                  disabled={sending}
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
    </AppLayout>
  )
}
