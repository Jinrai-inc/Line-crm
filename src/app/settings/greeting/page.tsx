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
                <Label>メッセージ本文</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="友だち追加ありがとうございます！&#10;セミナー情報やお得な情報をお届けします。"
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
                  <Label>期間中のメッセージ本文</Label>
                  <Textarea
                    value={scheduleMessage}
                    onChange={(e) => setScheduleMessage(e.target.value)}
                    placeholder="友だち追加ありがとうございます！&#10;現在キャンペーン実施中です！&#10;詳しくはこちらをご確認ください。"
                    rows={5}
                  />
                </div>
              </div>
            )}
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
