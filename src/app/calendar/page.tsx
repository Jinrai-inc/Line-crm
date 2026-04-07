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

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const days = getDaysInMonth(year, month)
  const firstDayOfWeek = days[0].getDay() // 0=Sun
  const grid: (Date | null)[][] = []
  let week: (Date | null)[] = []

  // Fill leading nulls
  for (let i = 0; i < firstDayOfWeek; i++) {
    week.push(null)
  }

  for (const day of days) {
    week.push(day)
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }

  // Fill trailing nulls
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null)
    }
    grid.push(week)
  }

  return grid
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

export default function CalendarPage() {
  const accentColor = useAccentColor()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form
  const [newSummary, setNewSummary] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("10:00")
  const [newEndTime, setNewEndTime] = useState("11:00")
  const [newLocation, setNewLocation] = useState("")

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

      const startOfMonth = new Date(year, month, 1)
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

      const params = new URLSearchParams({
        timeMin: startOfMonth.toISOString(),
        timeMax: endOfMonth.toISOString(),
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
  }, [year, month])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const grid = getCalendarGrid(year, month)

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0]
    return events.filter((e) => {
      const eventDate = e.start.dateTime
        ? e.start.dateTime.split("T")[0]
        : e.start.date
      return eventDate === dateStr
    })
  }

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1)
      setMonth(0)
    } else {
      setMonth(month + 1)
    }
  }

  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
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
        fetchEvents()
      }
    } catch {
      console.error("イベント削除に失敗しました")
    } finally {
      setDeleting(null)
    }
  }

  // Selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カレンダーグリッド */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {year}年{month + 1}月
                </h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={goToPrevMonth}>
                    <ChevronLeft size={18} />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
                    今日
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={goToNextMonth}>
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map((day, i) => (
                      <div
                        key={day}
                        className={`text-center text-xs font-medium py-2 ${
                          i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 border-t border-l border-gray-200">
                    {grid.flat().map((date, idx) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="border-r border-b border-gray-200 min-h-[80px] sm:min-h-[100px] bg-gray-50/50"
                          />
                        )
                      }

                      const isToday = date.toDateString() === today.toDateString()
                      const isSelected = selectedDate?.toDateString() === date.toDateString()
                      const dayEvents = getEventsForDate(date)
                      const dayOfWeek = date.getDay()

                      return (
                        <div
                          key={date.toISOString()}
                          className={`border-r border-b border-gray-200 min-h-[80px] sm:min-h-[100px] p-1 cursor-pointer transition-colors hover:bg-gray-50 ${
                            isSelected ? "bg-blue-50/70" : ""
                          }`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                                isToday
                                  ? "text-white"
                                  : dayOfWeek === 0
                                    ? "text-red-500"
                                    : dayOfWeek === 6
                                      ? "text-blue-500"
                                      : "text-gray-700"
                              }`}
                              style={isToday ? { backgroundColor: accentColor } : undefined}
                            >
                              {date.getDate()}
                            </span>
                          </div>

                          <div className="mt-0.5 space-y-0.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="text-[10px] sm:text-xs truncate rounded px-1 py-0.5 text-white leading-tight"
                                style={{ backgroundColor: accentColor }}
                                title={event.summary}
                              >
                                {event.start.dateTime
                                  ? `${formatTime(event.start.dateTime)} `
                                  : ""}
                                {event.summary}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-gray-500 px-1">
                                +{dayEvents.length - 3}件
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* サイドパネル: 選択日の予定 */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <CalendarDays size={16} style={{ color: accentColor }} />
                  {selectedDate
                    ? selectedDate.toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })
                    : "日付を選択"}
                </h3>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openCreateForDate(selectedDate)}
                  >
                    <Plus size={14} className="mr-1" />
                    追加
                  </Button>
                )}
              </div>

              {!selectedDate ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  カレンダーの日付をクリックしてください
                </p>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">予定はありません</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => openCreateForDate(selectedDate)}
                  >
                    <Plus size={14} className="mr-1" />
                    予定を追加
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{event.summary}</p>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <ExternalLink size={14} className="text-gray-400" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={deleting === event.id}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                          >
                            {deleting === event.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>

                      {event.start.date && !event.start.dateTime ? (
                        <Badge variant="secondary" className="text-xs mt-1">終日</Badge>
                      ) : event.start.dateTime ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock size={12} />
                          {formatTime(event.start.dateTime)}
                          {event.end.dateTime && ` - ${formatTime(event.end.dateTime)}`}
                        </div>
                      ) : null}

                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
