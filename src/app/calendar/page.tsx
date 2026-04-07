"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  Loader2,
  CalendarOff,
  Settings,
  Trash2,
} from "lucide-react"
import Link from "next/link"

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  htmlLink?: string
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
}

/** 指定日を含む週の月曜日を返す（日曜始まりにする場合は調整） */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  // 日曜始まり
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

// 時間スロット（6:00〜23:00）
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export default function CalendarPage() {
  const accentColor = useAccentColor()
  const today = new Date()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Create form
  const [newSummary, setNewSummary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("10:00")
  const [newEndTime, setNewEndTime] = useState("11:00")
  const [newLocation, setNewLocation] = useState("")

  const weekDays = getWeekDays(weekStart)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const settingsRes = await fetch("/api/google/calendar/settings")
      if (settingsRes.ok) {
        const json = await settingsRes.json()
        if (!json.settings || !json.settings.sync_enabled) {
          setConnected(false)
          setLoading(false)
          return
        }
        setConnected(true)
      } else {
        setConnected(false)
        setLoading(false)
        return
      }

      const startOfWeek = new Date(weekStart)
      const endOfWeek = new Date(weekStart)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        timeMin: startOfWeek.toISOString(),
        timeMax: endOfWeek.toISOString(),
      })

      const res = await fetch(`/api/google/calendar/events?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEvents(json.events || [])
      }
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0]
    return events.filter((e) => {
      const eventDate = e.start.dateTime
        ? e.start.dateTime.split("T")[0]
        : e.start.date
      return eventDate === dateStr
    })
  }

  const goToPrevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const goToNextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const goToToday = () => {
    setWeekStart(getWeekStart(today))
  }

  const openCreateForDate = (date: Date) => {
    setSelectedDate(date)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    setNewStartDate(`${y}-${m}-${d}`)
    setNewSummary("")
    setNewDescription("")
    setNewStartTime("10:00")
    setNewEndTime("11:00")
    setNewLocation("")
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!newSummary.trim() || !newStartDate) return
    setSaving(true)
    try {
      const startDateTime = `${newStartDate}T${newStartTime}:00+09:00`
      const endDateTime = `${newStartDate}T${newEndTime}:00+09:00`

      const res = await fetch("/api/google/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newSummary.trim(),
          description: newDescription.trim() || undefined,
          startDateTime,
          endDateTime,
        }),
      })

      if (res.ok) {
        setCreateOpen(false)
        fetchEvents()
      }
    } catch {
      console.error("イベント作成に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm("この予定を削除しますか？")) return
    setDeleting(eventId)
    try {
      const res = await fetch(`/api/google/calendar/events/${eventId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setSelectedEvent(null)
        fetchEvents()
      }
    } catch {
      console.error("イベント削除に失敗しました")
    } finally {
      setDeleting(null)
    }
  }

  /** イベントの時間位置を計算 */
  const getEventPosition = (event: CalendarEvent) => {
    if (!event.start.dateTime) return null
    const start = new Date(event.start.dateTime)
    const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000)
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const top = (startHour - 6) * 60 // 6:00起点、1時間=60px
    const height = Math.max((endHour - startHour) * 60, 20)
    return { top, height }
  }

  // 週の期間表示テキスト
  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekLabel = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 〜 ${weekEndDate.getMonth() + 1}月${weekEndDate.getDate()}日`

  if (connected === false && !loading) {
    return (
      <AppLayout>
        <PageHeader title="予定管理" description="Googleカレンダーの予定を管理します" />
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarOff size={48} className="text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              Googleカレンダーが連携されていません
            </p>
            <Button variant="outline" asChild>
              <Link href="/settings/google-calendar">
                <Settings size={16} className="mr-2" />
                カレンダーを連携する
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="予定管理"
        description="Googleカレンダーの予定を管理します"
        action={
          <Button
            onClick={() => openCreateForDate(today)}
            style={{ backgroundColor: accentColor }}
            className="text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            予定を追加
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* 週ナビゲーション */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold">{weekLabel}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={goToPrevWeek}>
                <ChevronLeft size={18} />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
                今日
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={goToNextWeek}>
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* ===== モバイル: リスト表示 ===== */}
              <div className="block sm:hidden space-y-3">
                {weekDays.map((date) => {
                  const dayEvents = getEventsForDate(date)
                  const isToday = date.toDateString() === today.toDateString()
                  const dayOfWeek = date.getDay()

                  return (
                    <div key={date.toISOString()} className="border rounded-lg overflow-hidden">
                      <div
                        className={`flex items-center justify-between px-3 py-2 ${
                          isToday ? "text-white" : "bg-gray-50"
                        }`}
                        style={isToday ? { backgroundColor: accentColor } : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            !isToday && dayOfWeek === 0 ? "text-red-500" : !isToday && dayOfWeek === 6 ? "text-blue-500" : ""
                          }`}>
                            {date.getMonth() + 1}/{date.getDate()}（{WEEKDAYS[dayOfWeek]}）
                          </span>
                          {dayEvents.length > 0 && (
                            <Badge variant={isToday ? "outline" : "secondary"} className={`text-[10px] ${isToday ? "border-white/50 text-white" : ""}`}>
                              {dayEvents.length}件
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${isToday ? "text-white hover:bg-white/20" : ""}`}
                          onClick={() => openCreateForDate(date)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>

                      {dayEvents.length > 0 && (
                        <div className="divide-y">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="px-3 py-2 flex items-start gap-2 hover:bg-gray-50 cursor-pointer"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div
                                className="w-1 rounded-full shrink-0 mt-1"
                                style={{ backgroundColor: accentColor, height: "32px" }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{event.summary}</p>
                                {event.start.dateTime ? (
                                  <p className="text-xs text-gray-500">
                                    {formatTime(event.start.dateTime)}
                                    {event.end.dateTime && ` - ${formatTime(event.end.dateTime)}`}
                                  </p>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">終日</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ===== デスクトップ: 週カレンダーグリッド ===== */}
              <div className="hidden sm:block">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                  <div /> {/* 時間列のヘッダー */}
                  {weekDays.map((date, i) => {
                    const isToday = date.toDateString() === today.toDateString()
                    const dayOfWeek = date.getDay()

                    return (
                      <div
                        key={date.toISOString()}
                        className={`text-center py-2 border-l ${isToday ? "bg-blue-50/50" : ""}`}
                      >
                        <span
                          className={`text-xs font-medium ${
                            dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-gray-500"
                          }`}
                        >
                          {WEEKDAYS[i]}
                        </span>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full ${
                              isToday ? "text-white" : ""
                            }`}
                            style={isToday ? { backgroundColor: accentColor } : undefined}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 終日イベント行 */}
                {events.some((e) => e.start.date && !e.start.dateTime) && (
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                    <div className="text-[10px] text-gray-400 text-right pr-2 py-1">終日</div>
                    {weekDays.map((date) => {
                      const allDayEvents = getEventsForDate(date).filter(
                        (e) => e.start.date && !e.start.dateTime
                      )
                      return (
                        <div key={date.toISOString()} className="border-l px-1 py-1 space-y-0.5">
                          {allDayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="text-[10px] text-white rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: accentColor }}
                              onClick={() => setSelectedEvent(event)}
                            >
                              {event.summary}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 時間グリッド */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
                  {/* 時間ラベル + 行 */}
                  <div className="relative">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] text-right pr-2 text-[10px] text-gray-400 border-b relative"
                      >
                        <span className="absolute -top-2 right-2">
                          {String(hour).padStart(2, "0")}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 各曜日列 */}
                  {weekDays.map((date) => {
                    const isToday = date.toDateString() === today.toDateString()
                    const dayTimedEvents = getEventsForDate(date).filter(
                      (e) => e.start.dateTime
                    )

                    return (
                      <div
                        key={date.toISOString()}
                        className={`border-l relative ${isToday ? "bg-blue-50/30" : ""}`}
                        onClick={() => openCreateForDate(date)}
                      >
                        {/* 時間の横線 */}
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[60px] border-b border-gray-100" />
                        ))}

                        {/* イベント表示 */}
                        {dayTimedEvents.map((event) => {
                          const pos = getEventPosition(event)
                          if (!pos) return null

                          return (
                            <div
                              key={event.id}
                              className="absolute left-1 right-1 rounded px-1.5 py-0.5 text-white text-[11px] overflow-hidden cursor-pointer hover:opacity-90 shadow-sm z-10"
                              style={{
                                backgroundColor: accentColor,
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                                minHeight: "20px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                              }}
                            >
                              <div className="font-medium truncate leading-tight">
                                {event.summary}
                              </div>
                              {pos.height > 30 && event.start.dateTime && (
                                <div className="text-[10px] opacity-80">
                                  {formatTime(event.start.dateTime)}
                                  {event.end.dateTime && ` - ${formatTime(event.end.dateTime)}`}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 予定詳細ダイアログ */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={18} style={{ color: accentColor }} />
              {selectedEvent?.summary}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              {selectedEvent.start.date && !selectedEvent.start.dateTime ? (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-400" />
                  <Badge variant="secondary">終日</Badge>
                </div>
              ) : selectedEvent.start.dateTime ? (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-400" />
                  <span>
                    {new Date(selectedEvent.start.dateTime).toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}{" "}
                    {formatTime(selectedEvent.start.dateTime)}
                    {selectedEvent.end.dateTime && ` - ${formatTime(selectedEvent.end.dateTime)}`}
                  </span>
                </div>
              ) : null}

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedEvent.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                {selectedEvent.htmlLink && (
                  <a
                    href={selectedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ExternalLink size={12} />
                    Googleカレンダーで開く
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(selectedEvent.id)}
                  disabled={deleting === selectedEvent.id}
                >
                  {deleting === selectedEvent.id ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <Trash2 size={14} className="mr-1" />
                  )}
                  削除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 予定作成ダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>予定を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="例: ミーティング"
              />
            </div>
            <div className="space-y-2">
              <Label>日付</Label>
              <Input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>開始時間</Label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>終了時間</Label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>場所</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="例: Zoom / 会議室A"
              />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="詳細メモ（任意）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newSummary.trim() || !newStartDate || saving}
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
