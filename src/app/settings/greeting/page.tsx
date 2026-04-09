"use client"

import { useState, useEffect } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  CalendarClock,
  Eye,
  ClipboardList,
  Plus,
  Trash2,
  Send,
  User,
} from "lucide-react"

export default function GreetingSettingsPage() {
  const accentColor = useAccentColor()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // 通常の挨拶メッセージ
  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState("")

  // 期間指定メッセージ
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleStart, setScheduleStart] = useState("")
  const [scheduleEnd, setScheduleEnd] = useState("")
  const [scheduleMessage, setScheduleMessage] = useState("")

  // ウェルカムアンケート
  const [welcomeSurveyId, setWelcomeSurveyId] = useState("")
  const [surveys, setSurveys] = useState<{ id: string; title: string }[]>([])

  // フォローアップメッセージ（挨拶後に自動送信するテキスト）
  const [followUpMessages, setFollowUpMessages] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/surveys").then(r => r.json()).then(j => setSurveys(j.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/greeting")
        if (res.ok) {
          const json = await res.json()
          if (json.settings) {
            setEnabled(json.settings.enabled ?? true)
            setMessage(json.settings.message || "")
            setScheduleEnabled(json.settings.schedule_enabled ?? false)
            setScheduleStart(json.settings.schedule_start ? json.settings.schedule_start.slice(0, 16) : "")
            setScheduleEnd(json.settings.schedule_end ? json.settings.schedule_end.slice(0, 16) : "")
            setScheduleMessage(json.settings.schedule_message || "")
            setWelcomeSurveyId(json.settings.welcome_survey_id || "")
            setFollowUpMessages(json.settings.follow_up_messages || [])
          }
        }
      } catch {
        console.error("挨拶設定の取得に失敗しました")
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          message,
          scheduleEnabled,
          scheduleStart: scheduleStart ? new Date(scheduleStart).toISOString() : null,
          scheduleEnd: scheduleEnd ? new Date(scheduleEnd).toISOString() : null,
          scheduleMessage,
          welcomeSurveyId: welcomeSurveyId || null,
          followUpMessages: followUpMessages.filter(m => m.trim()),
        }),
      })
      if (res.ok) {
        setToast({ type: "success", message: "挨拶メッセージ設定を保存しました" })
      } else {
        setToast({ type: "error", message: "保存に失敗しました" })
      }
    } catch {
      setToast({ type: "error", message: "保存に失敗しました" })
    } finally {
      setSaving(false)
    }
  }

  // 期間が有効かどうか判定
  const isScheduleActive = scheduleEnabled && scheduleStart && scheduleEnd
    ? new Date() >= new Date(scheduleStart) && new Date() <= new Date(scheduleEnd)
    : false

  // 現在のアクティブメッセージを取得
  const activeMessage = isScheduleActive && scheduleMessage
    ? scheduleMessage
    : message || `へようこそ！\n友だち追加ありがとうございます。\n以下のメニューからご利用いただけます。`

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="挨拶メッセージ設定" description="友だち追加時の自動メッセージを設定します" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="挨拶メッセージ設定"
        description="友だち追加時の自動メッセージを設定します"
        action={
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: accentColor }}
            className="text-white hover:opacity-90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">
        {/* 通常の挨拶メッセージ */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} style={{ color: accentColor }} />
                <h2 className="text-base font-semibold">通常の挨拶メッセージ</h2>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="greeting-enabled" className="text-sm text-gray-500">
                  {enabled ? "有効" : "無効"}
                </Label>
                <Switch
                  id="greeting-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              友だち追加されたときに自動送信されるメッセージを設定します。
            </p>

            {enabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>メッセージ本文</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const ta = document.querySelector("#greeting-message") as HTMLTextAreaElement | null
                      if (!ta) return
                      const s = ta.selectionStart, e = ta.selectionEnd
                      setMessage(message.substring(0, s) + "{name}" + message.substring(e))
                      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 6, s + 6) }, 0)
                    }}
                  >
                    <User className="h-3 w-3 mr-1" />
                    名前挿入
                  </Button>
                </div>
                <Textarea
                  id="greeting-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="{name}さん、友だち追加ありがとうございます！&#10;セミナー情報やお得な情報をお届けします。"
                  rows={5}
                />
                <p className="text-xs text-gray-400">
                  空欄の場合はデフォルトのウェルカムメッセージが使用されます。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 期間指定メッセージ */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={20} style={{ color: accentColor }} />
                <h2 className="text-base font-semibold">期間指定メッセージ</h2>
                {isScheduleActive && (
                  <Badge className="bg-green-100 text-green-700 border-transparent text-xs">
                    現在有効
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="schedule-enabled" className="text-sm text-gray-500">
                  {scheduleEnabled ? "有効" : "無効"}
                </Label>
                <Switch
                  id="schedule-enabled"
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              特定の期間内に友だち追加された人には、通常メッセージの代わりにこちらのメッセージが送信されます。
              キャンペーン案内やイベント告知などに活用できます。
            </p>

            {scheduleEnabled && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>開始日時</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>終了日時</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                    />
                  </div>
                </div>

                {scheduleStart && scheduleEnd && new Date(scheduleEnd) <= new Date(scheduleStart) && (
                  <p className="text-xs text-red-500">終了日時は開始日時より後に設定してください。</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>期間中のメッセージ本文</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        const ta = document.querySelector("#schedule-message") as HTMLTextAreaElement | null
                        if (!ta) return
                        const s = ta.selectionStart, e = ta.selectionEnd
                        setScheduleMessage(scheduleMessage.substring(0, s) + "{name}" + scheduleMessage.substring(e))
                        setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 6, s + 6) }, 0)
                      }}
                    >
                      <User className="h-3 w-3 mr-1" />
                      名前挿入
                    </Button>
                  </div>
                  <Textarea
                    id="schedule-message"
                    value={scheduleMessage}
                    onChange={(e) => setScheduleMessage(e.target.value)}
                    placeholder="{name}さま&#10;友だち追加ありがとうございます！&#10;現在キャンペーン実施中です！"
                    rows={5}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* フォローアップ自動配信 */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Send size={20} style={{ color: accentColor }} />
              <h2 className="text-base font-semibold">フォローアップ自動配信</h2>
            </div>

            <p className="text-sm text-gray-500">
              挨拶メッセージの後に、追加のメッセージやアンケートを自動送信します。
              上から順番に送信されます。
            </p>

            {/* フォローアップテキストメッセージ */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">追加メッセージ</Label>
              {followUpMessages.map((msg, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">メッセージ {idx + 1}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 text-[10px] px-1.5"
                        onClick={() => {
                          const ta = document.querySelector(`#followup-msg-${idx}`) as HTMLTextAreaElement | null
                          if (!ta) return
                          const s = ta.selectionStart, e = ta.selectionEnd
                          const updated = [...followUpMessages]
                          updated[idx] = msg.substring(0, s) + "{name}" + msg.substring(e)
                          setFollowUpMessages(updated)
                          setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 6, s + 6) }, 0)
                        }}
                      >
                        <User className="h-2.5 w-2.5 mr-0.5" />
                        名前挿入
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1 text-red-400 hover:text-red-600"
                        onClick={() => setFollowUpMessages(followUpMessages.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      id={`followup-msg-${idx}`}
                      value={msg}
                      onChange={(e) => {
                        const updated = [...followUpMessages]
                        updated[idx] = e.target.value
                        setFollowUpMessages(updated)
                      }}
                      placeholder="{name}さん、送信するメッセージを入力..."
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFollowUpMessages([...followUpMessages, ""])}
                className="w-full"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                メッセージを追加
              </Button>
            </div>

            {/* ウェルカムアンケート */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-1">
                <ClipboardList size={14} />
                自動送信アンケート
              </Label>
              <p className="text-xs text-gray-500">
                追加メッセージの後にアンケートを自動送信します。
              </p>
              <select
                value={welcomeSurveyId}
                onChange={(e) => setWelcomeSurveyId(e.target.value)}
                className="w-full h-10 border rounded-md px-3 bg-white text-sm"
              >
                <option value="">なし（送信しない）</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                アンケートは「アンケート」ページで事前に作成してください。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* プレビュー */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Eye size={20} style={{ color: accentColor }} />
              <h2 className="text-base font-semibold">メッセージプレビュー</h2>
              {isScheduleActive && (
                <Badge variant="outline" className="text-xs">期間指定メッセージ表示中</Badge>
              )}
            </div>

            <div className="bg-[#7494C0] rounded-xl p-4 max-w-sm mx-auto">
              {/* LINE風のメッセージバブル */}
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[280px] shadow-sm">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {activeMessage}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {isScheduleActive
                ? "現在は期間指定メッセージが送信されます"
                : scheduleEnabled && scheduleStart
                  ? `${new Date(scheduleStart).toLocaleString("ja-JP")} から期間指定メッセージに切り替わります`
                  : "友だち追加時に送信されるメッセージです"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* トースト */}
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
