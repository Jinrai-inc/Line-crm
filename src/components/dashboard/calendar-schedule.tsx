"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Clock,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CalendarOff,
  Settings,
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
  status?: string
}

interface CalendarScheduleProps {
  accentColor: string
}

function formatEventTime(start: { dateTime?: string; date?: string }, end: { dateTime?: string; date?: string }): string {
  if (start.date) {
    return "終日"
  }
  if (start.dateTime) {
    const s = new Date(start.dateTime)
    const e = end.dateTime ? new Date(end.dateTime) : null
    const startStr = s.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    if (e) {
      const endStr = e.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
      return `${startStr} - ${endStr}`
    }
    return startStr
  }
  return ""
}

function getEventDate(event: CalendarEvent): Date {
  if (event.start.dateTime) return new Date(event.start.dateTime)
  if (event.start.date) return new Date(event.start.date)
  return new Date()
}

function formatDateHeader(date: Date, today: Date): string {
  const isToday = date.toDateString() === today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const dayStr = date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })

  if (isToday) return `今日 - ${dayStr}`
  if (isTomorrow) return `明日 - ${dayStr}`
  return dayStr
}

function isAllDay(event: CalendarEvent): boolean {
  return !!event.start.date && !event.start.dateTime
}

export function CalendarSchedule({ accentColor }: CalendarScheduleProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetchEvents()
  }, [weekOffset])

  async function fetchEvents() {
    setLoading(true)
    try {
      // Check if connected first
      const settingsRes = await fetch("/api/google/calendar/settings")
      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json()
        if (!settingsJson.settings || !settingsJson.settings.sync_enabled) {
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

      // Fetch events for the current week range
      const now = new Date()
      const startOfRange = new Date(now)
      startOfRange.setDate(startOfRange.getDate() + weekOffset * 7)
      if (weekOffset === 0) {
        startOfRange.setHours(0, 0, 0, 0)
      } else {
        // Start from Monday of that week
        const day = startOfRange.getDay()
        const diff = day === 0 ? -6 : 1 - day
        startOfRange.setDate(startOfRange.getDate() + diff)
        startOfRange.setHours(0, 0, 0, 0)
      }

      const endOfRange = new Date(startOfRange)
      endOfRange.setDate(endOfRange.getDate() + 7)
      endOfRange.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        timeMin: startOfRange.toISOString(),
        timeMax: endOfRange.toISOString(),
      })

      const res = await fetch(`/api/google/calendar/events?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEvents(json.events || [])
      } else {
        setEvents([])
      }
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // Group events by date
  const today = new Date()
  const groupedEvents = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const date = getEventDate(event)
    const key = date.toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  const weekLabel = (() => {
    if (weekOffset === 0) return "今週"
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() + weekOffset * 7)
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
  })()

  // Not connected state
  if (connected === false && !loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <CalendarDays size={18} style={{ color: accentColor }} />
            Googleカレンダー
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarOff size={40} className="text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Googleカレンダーが連携されていません
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/google-calendar">
              <Settings size={14} className="mr-1" />
              カレンダーを連携する
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <CalendarDays size={18} style={{ color: accentColor }} />
          Googleカレンダー
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-muted transition-colors min-w-[60px] text-center"
          >
            {weekLabel}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarDays size={32} className="text-gray-300 mb-2" />
          <p className="text-sm text-muted-foreground">
            この期間の予定はありません
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {sortedDates.map((dateKey) => {
            const date = new Date(dateKey)
            const isTodays = date.toDateString() === today.toDateString()

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isTodays
                        ? "text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    style={isTodays ? { backgroundColor: accentColor } : undefined}
                  >
                    {formatDateHeader(date, today)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Events for this date */}
                <div className="space-y-2 ml-1">
                  {groupedEvents[dateKey].map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {/* Time indicator */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: accentColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {event.summary}
                          </p>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <ExternalLink size={14} className="text-muted-foreground" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          {isAllDay(event) ? (
                            <Badge variant="secondary" className="text-xs py-0 h-5">
                              終日
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={12} />
                              {formatEventTime(event.start, event.end)}
                            </span>
                          )}

                          {event.location && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[200px]">
                              <MapPin size={12} className="shrink-0" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
