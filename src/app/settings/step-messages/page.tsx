"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  GripVertical,
  User,
} from "lucide-react"

interface StepMessage {
  id?: string
  delay_days: number
  delay_hours: number
  message: string
  enabled: boolean
}

export default function StepMessagesPage() {
  const accentColor = useAccentColor()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [steps, setSteps] = useState<StepMessage[]>([])
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/settings/step-messages")
      if (res.ok) {
        const json = await res.json()
        setEnabled(json.enabled ?? false)
        setSteps(json.steps ?? [])
      }
    } catch {
      console.error("ステップ配信設定の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/step-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, steps }),
      })
      if (res.ok) {
        setToast({ type: "success", message: "ステップ配信設定を保存しました" })
        fetchSettings()
      } else {
        setToast({ type: "error", message: "保存に失敗しました" })
      }
    } catch {
      setToast({ type: "error", message: "保存に失敗しました" })
    } finally {
      setSaving(false)
    }
  }

  function addStep() {
    const lastStep = steps[steps.length - 1]
    const nextDays = lastStep ? lastStep.delay_days + 1 : 1
    setSteps([...steps, { delay_days: nextDays, delay_hours: 0, message: "", enabled: true }])
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx))
  }

  function updateStep(idx: number, field: keyof StepMessage, value: unknown) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function insertNameTag(idx: number) {
    const textarea = document.querySelector(`#step-message-${idx}`) as HTMLTextAreaElement | null
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = steps[idx].message
    const newValue = currentValue.substring(0, start) + "{name}" + currentValue.substring(end)
    updateStep(idx, "message", newValue)
    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 6, start + 6)
    }, 0)
  }

  // 合計配信日数
  const totalDays = steps.length > 0 ? Math.max(...steps.map(s => s.delay_days)) : 0

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="ステップ配信" description="友だち追加後に時間差でメッセージを自動配信します" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="ステップ配信"
        description="友だち追加後に時間差でメッセージを自動配信します"
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
        {/* 有効/無効切り替え */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Send size={20} style={{ color: accentColor }} />
                  ステップ配信
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  友だち追加後、設定した日時にメッセージを自動送信します。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500">{enabled ? "有効" : "無効"}</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </div>
            {enabled && steps.length > 0 && (
              <div className="mt-4 flex gap-3">
                <Badge variant="secondary" className="text-xs">
                  {steps.length}ステップ
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  最大{totalDays}日間
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ステップ一覧 */}
        {enabled && (
          <>
            {steps.map((step, idx) => (
              <Card key={idx} className={!step.enabled ? "opacity-60" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                      <Badge style={{ backgroundColor: accentColor }} className="text-white text-xs">
                        STEP {idx + 1}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          友だち追加から
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={step.enabled}
                        onCheckedChange={(v) => updateStep(idx, "enabled", v)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(idx)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 配信タイミング */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={step.delay_days}
                      onChange={(e) => updateStep(idx, "delay_days", parseInt(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-gray-600">日</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={step.delay_hours}
                      onChange={(e) => updateStep(idx, "delay_hours", parseInt(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-gray-600">時間後に送信</span>
                  </div>

                  {/* メッセージ */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">メッセージ内容</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => insertNameTag(idx)}
                      >
                        <User className="h-3 w-3 mr-1" />
                        名前挿入
                      </Button>
                    </div>
                    <Textarea
                      id={`step-message-${idx}`}
                      value={step.message}
                      onChange={(e) => updateStep(idx, "message", e.target.value)}
                      placeholder="{name}さん、友だち追加ありがとうございます！&#10;本日は特別なご案内をお届けします。"
                      rows={4}
                    />
                    <p className="text-xs text-gray-400">
                      <span className="text-blue-500">{"{name}"}で相手の名前を自動挿入</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <button
              type="button"
              onClick={addStep}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
            >
              <Plus className="h-5 w-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">ステップを追加</p>
            </button>
          </>
        )}

        {/* フロー図 */}
        {enabled && steps.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">配信フロー</h3>
              <div className="space-y-0">
                <div className="flex items-center gap-3 pb-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">友だち追加</span>
                </div>
                {steps.filter(s => s.enabled).sort((a, b) => (a.delay_days * 24 + a.delay_hours) - (b.delay_days * 24 + b.delay_hours)).map((step, i) => (
                  <div key={i}>
                    <div className="ml-4 border-l-2 border-gray-200 pl-6 py-2">
                      <span className="text-xs text-gray-400">
                        {step.delay_days > 0 ? `${step.delay_days}日` : ""}{step.delay_hours > 0 ? `${step.delay_hours}時間` : ""}{step.delay_days === 0 && step.delay_hours === 0 ? "即時" : "後"}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                        <Send className="h-3.5 w-3.5" style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-medium" style={{ color: accentColor }}>STEP {i + 1}</span>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                          {step.message || "(メッセージ未入力)"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
