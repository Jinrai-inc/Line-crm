"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAccentColor } from "@/hooks/use-accent-color"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  MessageSquare,
  Tag,
  Link as LinkIcon,
  Eye,
  CheckCircle2,
} from "lucide-react"

interface FollowupButton {
  label: string
  tagName: string
  responseMessage: string
  responseUrl: string
}

interface TemplateData {
  id: string
  name: string
  category: string
  template_type: string
  content_json: string
}

const PRESET_TEMPLATES = [
  {
    id: "_preset_seminar_thanks",
    name: "セミナー参加お礼（基本）",
    message:
      "🎓 {name}様\n\nこの度はセミナーにお申込みいただき、誠にありがとうございます！\n\n当日お会いできることを楽しみにしております。\nご不明点がございましたら、お気軽にメッセージをお送りください。",
  },
  {
    id: "_preset_seminar_detail",
    name: "セミナー詳細付きお礼",
    message:
      "✅ {name}様、お申込みありがとうございます！\n\n📅 セミナー当日の持ち物：\n・筆記用具\n・お名刺（お持ちの方）\n\n⏰ 開始10分前までにお越しください。\n\n何かご質問がありましたら、お気軽にどうぞ！",
  },
  {
    id: "_preset_seminar_followup",
    name: "セミナー後フォローアップ",
    message:
      "🙏 {name}様\n\n本日はセミナーにご参加いただきありがとうございました！\n\nいかがでしたでしょうか？\nご感想やご質問がございましたら、お気軽にメッセージください。\n\n今後ともよろしくお願いいたします。",
  },
]

const VARIABLES = [
  { key: "{name}", label: "参加者名", description: "LINE表示名に置換されます" },
  { key: "{seminar_title}", label: "セミナー名", description: "セミナーのタイトルに置換されます" },
  { key: "{date}", label: "開催日", description: "セミナーの開催日に置換されます" },
]

export default function SeminarFollowupPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const accentColor = useAccentColor()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [thankYouMessage, setThankYouMessage] = useState("")
  const [buttons, setButtons] = useState<FollowupButton[]>([])
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [seminarTitle, setSeminarTitle] = useState("")

  const fetchFollowup = useCallback(async () => {
    try {
      setLoading(true)
      const [followupRes, seminarRes] = await Promise.all([
        fetch(`/api/seminars/${id}/followup`),
        fetch(`/api/seminars/${id}`),
      ])
      const followupJson = await followupRes.json()
      const seminarJson = await seminarRes.json()

      if (followupJson.data) {
        setEnabled(followupJson.data.enabled ?? false)
        setThankYouMessage(followupJson.data.thank_you_message ?? "")
        setButtons(followupJson.data.buttons ?? [])
      }
      if (seminarJson.data) {
        setSeminarTitle(seminarJson.data.title ?? "")
      }
    } catch {
      console.error("設定の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/message-templates?category=seminar")
      const json = await res.json()
      setTemplates(json.data ?? [])
    } catch {
      // templates are optional
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchFollowup()
      fetchTemplates()
    }
  }, [id, fetchFollowup, fetchTemplates])

  async function handleSave() {
    try {
      setSaving(true)
      const res = await fetch(`/api/seminars/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thankYouMessage,
          buttons,
          enabled,
        }),
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

  function insertVariable(variable: string) {
    setThankYouMessage((prev) => prev + variable)
  }

  function applyPreset(presetId: string) {
    const preset = PRESET_TEMPLATES.find((p) => p.id === presetId)
    if (preset) {
      setThankYouMessage(preset.message)
    }
  }

  function applyTemplate(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setThankYouMessage(tmpl.content_json || "")
    }
  }

  function addButton() {
    if (buttons.length >= 3) return
    setButtons([...buttons, { label: "", tagName: "", responseMessage: "", responseUrl: "" }])
  }

  function removeButton(index: number) {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  function updateButton(index: number, field: keyof FollowupButton, value: string) {
    setButtons(buttons.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)))
  }

  // Preview with variable substitution
  const previewMessage = thankYouMessage
    .replace(/\{name\}/g, "山田太郎")
    .replace(/\{seminar_title\}/g, seminarTitle || "セミナー")
    .replace(/\{date\}/g, "2026年4月15日")

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

  return (
    <AppLayout>
      <PageHeader
        title="フォローアップ設定"
        description={seminarTitle ? `「${seminarTitle}」の参加者向けメッセージ設定` : "セミナー参加者へのメッセージ設定"}
        action={
          <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            セミナー詳細に戻る
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左: 設定フォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 有効/無効トグル */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">自動フォローアップを有効にする</p>
                  <p className="text-sm text-gray-500">
                    セミナー申込時に自動でお礼メッセージを送信します
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* お礼メッセージ */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" style={{ color: accentColor }} />
                  お礼メッセージ
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* テンプレート選択 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">テンプレートから選ぶ</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TEMPLATES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      {preset.name}
                    </button>
                  ))}
                  {templates.length > 0 && templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 変数挿入 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">変数を挿入</Label>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="group relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-gray-300 bg-gray-50 text-xs font-mono text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                    >
                      {v.key}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-gray-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {v.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* メッセージ入力 */}
              <div className="space-y-2">
                <Label htmlFor="thank-you-message">メッセージ本文</Label>
                <Textarea
                  id="thank-you-message"
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="セミナーにご参加いただきありがとうございました！&#10;&#10;{name}様、当日お会いできることを楽しみにしております。"
                  rows={8}
                  className="font-sans"
                />
              </div>
            </CardContent>
          </Card>

          {/* ボタン設定 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" style={{ color: accentColor }} />
                    アクションボタン
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    ボタンを追加すると、タップした参加者に自動でタグ付与やURL送信ができます
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addButton}
                  disabled={buttons.length >= 3}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {buttons.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">ボタンが未設定です</p>
                  <p className="text-xs text-gray-400 mt-1">
                    例: 「特典を受け取る」ボタンで申込者を分類できます
                  </p>
                </div>
              ) : (
                buttons.map((btn, index) => (
                  <div
                    key={index}
                    className="border rounded-xl p-4 space-y-3 relative bg-gray-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        ボタン {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeButton(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">ボタンラベル</Label>
                        <Input
                          value={btn.label}
                          onChange={(e) => updateButton(index, "label", e.target.value)}
                          placeholder="例: IBJ会員です"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          自動付与タグ
                        </Label>
                        <Input
                          value={btn.tagName}
                          onChange={(e) => updateButton(index, "tagName", e.target.value)}
                          placeholder="例: IBJ会員"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        応答メッセージ
                      </Label>
                      <Input
                        value={btn.responseMessage}
                        onChange={(e) => updateButton(index, "responseMessage", e.target.value)}
                        placeholder="例: 特典をお受け取りください！"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        応答URL（任意）
                      </Label>
                      <Input
                        value={btn.responseUrl}
                        onChange={(e) => updateButton(index, "responseUrl", e.target.value)}
                        placeholder="https://example.com/benefit"
                        className="h-9"
                      />
                    </div>
                  </div>
                ))
              )}
              {buttons.length > 0 && buttons.length < 3 && (
                <p className="text-xs text-gray-500 text-center">
                  最大3つまで（残り{3 - buttons.length}つ）
                </p>
              )}
            </CardContent>
          </Card>

          {/* 保存ボタン */}
          <div className="flex items-center justify-end gap-3">
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

        {/* 右: LINEプレビュー */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" style={{ color: accentColor }} />
                  LINEプレビュー
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* LINE chat mock */}
                <div className="bg-[#7494C0] rounded-xl p-3 min-h-[300px]">
                  {thankYouMessage ? (
                    <div className="space-y-2">
                      {/* Message bubble */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">
                            {previewMessage}
                          </p>
                        </div>
                      </div>

                      {/* Buttons preview */}
                      {buttons.filter((b) => b.label).length > 0 && (
                        <div className="flex justify-start">
                          <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden max-w-[85%]">
                            <div className="px-4 py-2.5">
                              <p className="text-xs text-gray-500">以下からお選びください</p>
                            </div>
                            <div className="border-t divide-y">
                              {buttons
                                .filter((b) => b.label)
                                .map((btn, i) => (
                                  <div
                                    key={i}
                                    className="px-4 py-2.5 text-center text-sm font-medium"
                                    style={{ color: accentColor }}
                                  >
                                    {btn.label}
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-white/60 text-sm">
                      メッセージを入力すると
                      <br />
                      プレビューが表示されます
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    変数はサンプルデータで表示しています
                  </p>
                  {buttons.filter((b) => b.tagName).length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">自動タグ付与:</span>{" "}
                      {buttons
                        .filter((b) => b.tagName)
                        .map((b) => b.tagName)
                        .join("、")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
