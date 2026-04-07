"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAccentColor } from "@/hooks/use-accent-color"
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
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Timer,
  Tag,
  UserPlus,
  Clock,
  CalendarClock,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface AutoTagRule {
  id: string
  tag_name: string
  duration_minutes: number | null
  schedule_type: "duration" | "scheduled" | null
  start_at: string | null
  end_at: string | null
  enabled: boolean
  created_at: string
}

const DURATION_PRESETS = [
  { label: "5分", value: 5 },
  { label: "10分", value: 10 },
  { label: "15分", value: 15 },
  { label: "30分", value: 30 },
  { label: "1時間", value: 60 },
  { label: "2時間", value: 120 },
  { label: "6時間", value: 360 },
  { label: "12時間", value: 720 },
  { label: "24時間", value: 1440 },
]

export default function AutoTagSettingsPage() {
  const router = useRouter()
  const accentColor = useAccentColor()
  const [rules, setRules] = useState<AutoTagRule[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // 新規ルールフォーム
  const [newTagName, setNewTagName] = useState("")
  const [newDuration, setNewDuration] = useState("30")
  const [customDuration, setCustomDuration] = useState("")
  const [newScheduleType, setNewScheduleType] = useState<"duration" | "scheduled">("duration")
  const [newStartAt, setNewStartAt] = useState("")
  const [newEndAt, setNewEndAt] = useState("")

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/settings/auto-tag-rules")
      const json = await res.json()
      setRules(json.data ?? [])
    } catch {
      console.error("ルール取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  async function handleAdd() {
    if (!newTagName.trim()) return

    if (newScheduleType === "scheduled") {
      if (!newStartAt || !newEndAt) return
    } else {
      const duration = newDuration === "custom"
        ? parseInt(customDuration, 10)
        : parseInt(newDuration, 10)
      if (!duration || duration <= 0) return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        tagName: newTagName.trim(),
        scheduleType: newScheduleType,
        enabled: true,
      }

      if (newScheduleType === "scheduled") {
        body.startAt = new Date(newStartAt).toISOString()
        body.endAt = new Date(newEndAt).toISOString()
      } else {
        body.durationMinutes = newDuration === "custom"
          ? parseInt(customDuration, 10)
          : parseInt(newDuration, 10)
      }

      const res = await fetch("/api/settings/auto-tag-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setAddOpen(false)
        setNewTagName("")
        setNewDuration("30")
        setCustomDuration("")
        setNewScheduleType("duration")
        setNewStartAt("")
        setNewEndAt("")
        fetchRules()
      }
    } catch {
      console.error("ルール作成に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(ruleId: string, enabled: boolean) {
    try {
      await fetch("/api/settings/auto-tag-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId, enabled }),
      })
      setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r)))
    } catch {
      console.error("更新に失敗しました")
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("このルールを削除しますか？")) return
    try {
      await fetch("/api/settings/auto-tag-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId }),
      })
      setRules(rules.filter((r) => r.id !== ruleId))
    } catch {
      console.error("削除に失敗しました")
    }
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}分`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}時間${minutes % 60 > 0 ? `${minutes % 60}分` : ""}`
    return `${Math.floor(minutes / 1440)}日`
  }

  return (
    <AppLayout>
      <PageHeader
        title="自動タグ付与設定"
        description="友だち追加から一定時間以内の登録者に自動でタグを付与します"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/settings")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              設定に戻る
            </Button>
            <Button
              onClick={() => setAddOpen(true)}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              ルールを追加
            </Button>
          </div>
        }
      />

      {/* 説明カード */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Timer className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">時間制限付き自動タグ付与</p>
              <p className="text-sm text-blue-700 mt-1">
                友だちが追加された時、設定した時間枠が有効であれば自動的にタグが付与されます。
                2つのモードが選べます：
              </p>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-0.5">
                <li><strong>今から○分間</strong>：有効化した瞬間から指定時間だけ適用</li>
                <li><strong>時刻を指定</strong>：開始〜終了日時を設定して予約</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ルール一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">ルールが設定されていません</p>
            <p className="text-xs text-gray-400 mb-4">
              「ルールを追加」からタグ付与ルールを作成してください
            </p>
            <Button
              variant="outline"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              最初のルールを追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const isActive = rule.enabled
            const now = new Date()
            let isExpired = false
            let remainingMins = 0
            let expiresAt: Date | null = null
            let startAt: Date | null = null

            if (rule.schedule_type === "scheduled") {
              startAt = rule.start_at ? new Date(rule.start_at) : null
              expiresAt = rule.end_at ? new Date(rule.end_at) : null
              if (expiresAt) {
                isExpired = now > expiresAt
                remainingMins = Math.ceil((expiresAt.getTime() - now.getTime()) / 60000)
              }
            } else {
              const createdAt = new Date(rule.created_at)
              expiresAt = new Date(createdAt.getTime() + (rule.duration_minutes || 0) * 60 * 1000)
              isExpired = now > expiresAt
              remainingMins = Math.ceil((expiresAt.getTime() - now.getTime()) / 60000)
            }

            const isScheduledNotStarted = rule.schedule_type === "scheduled" && startAt && now < startAt

            return (
              <Card key={rule.id} className={!isActive ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-sm font-medium">{rule.tag_name}</span>
                          {isActive && isScheduledNotStarted ? (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              <CalendarClock className="h-3 w-3 mr-1" />
                              予定
                            </Badge>
                          ) : isActive && !isExpired ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              残り{formatDuration(remainingMins)}
                            </Badge>
                          ) : isActive && isExpired ? (
                            <Badge variant="secondary" className="text-xs">期限切れ</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">無効</Badge>
                          )}
                          {rule.schedule_type === "scheduled" && (
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">時刻指定</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {rule.schedule_type === "scheduled" ? (
                            <>
                              {startAt && startAt.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              {" 〜 "}
                              {expiresAt && expiresAt.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </>
                          ) : (
                            <>
                              友だち追加から {formatDuration(rule.duration_minutes || 0)} 以内に付与
                              <span className="mx-1">・</span>
                              作成: {new Date(rule.created_at).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              {isActive && !isExpired && expiresAt && (
                                <>
                                  <span className="mx-1">・</span>
                                  終了: {expiresAt.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ルール追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>自動タグ付与ルールを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タグ名</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="例: セミナー参加者、キャンペーン応募者"
              />
              <p className="text-xs text-gray-500">
                存在しないタグ名の場合は自動で作成されます
              </p>
            </div>

            {/* スケジュールタイプ選択 */}
            <div className="space-y-2">
              <Label>タイプ</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewScheduleType("duration")}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                    newScheduleType === "duration"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Timer className={`h-4 w-4 ${newScheduleType === "duration" ? "text-teal-600" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium">今から○分間</p>
                    <p className="text-xs text-gray-500">即時開始</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewScheduleType("scheduled")}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                    newScheduleType === "scheduled"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <CalendarClock className={`h-4 w-4 ${newScheduleType === "scheduled" ? "text-blue-600" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium">時刻を指定</p>
                    <p className="text-xs text-gray-500">開始〜終了</p>
                  </div>
                </button>
              </div>
            </div>

            {newScheduleType === "duration" ? (
              <>
                <div className="space-y-2">
                  <Label>有効時間</Label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">カスタム</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newDuration === "custom" && (
                  <div className="space-y-2">
                    <Label>カスタム時間（分）</Label>
                    <Input
                      type="number"
                      min={1}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="例: 45"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>開始日時</Label>
                  <Input
                    type="datetime-local"
                    value={newStartAt}
                    onChange={(e) => setNewStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日時</Label>
                  <Input
                    type="datetime-local"
                    value={newEndAt}
                    onChange={(e) => setNewEndAt(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                {newScheduleType === "scheduled" ? (
                  <>
                    <strong>動作：</strong>
                    {newStartAt && newEndAt
                      ? `${new Date(newStartAt).toLocaleString("ja-JP")} 〜 ${new Date(newEndAt).toLocaleString("ja-JP")} の間に`
                      : "指定した時間帯に"}
                    友だち追加されたユーザーに「{newTagName || "（タグ名）"}」タグが自動付与されます。
                  </>
                ) : (
                  <>
                    <strong>動作：</strong>ルールを有効にした瞬間から
                    {newDuration === "custom"
                      ? customDuration ? `${customDuration}分間` : "指定時間"
                      : `${DURATION_PRESETS.find((p) => String(p.value) === newDuration)?.label || newDuration + "分"}間`}
                    、友だち追加されたユーザーに「{newTagName || "（タグ名）"}」タグが自動付与されます。
                  </>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !newTagName.trim()}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
