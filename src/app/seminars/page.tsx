"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatTime } from "@/lib/utils/date"
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Loader2,
} from "lucide-react"

interface Seminar {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  capacity: number
  status: "open" | "closed" | "cancelled"
  attendee_count: number
}

const statusLabels: Record<string, string> = {
  open: "受付中",
  closed: "締切",
  cancelled: "中止",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  closed: "secondary",
  cancelled: "destructive",
}

export default function SeminarsPage() {
  const router = useRouter()
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchSeminars()
  }, [])

  async function fetchSeminars() {
    try {
      setLoading(true)
      const res = await fetch("/api/seminars")
      const json = await res.json()
      setSeminars(json.data ?? [])
    } catch {
      console.error("セミナー一覧の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return seminars.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [seminars, statusFilter, search])

  return (
    <AppLayout>
      <PageHeader
        title="セミナー管理"
        description="セミナーの作成・管理を行います"
        action={
          <Button onClick={() => router.push("/seminars/new")}>
            <Plus className="h-4 w-4 mr-2" />
            セミナー作成
          </Button>
        }
      />

      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="タイトルで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="open">受付中</TabsTrigger>
            <TabsTrigger value="closed">締切</TabsTrigger>
            <TabsTrigger value="cancelled">中止</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* セミナー一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {search || statusFilter !== "all"
              ? "条件に一致するセミナーがありません"
              : "セミナーがまだありません"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((seminar) => (
            <Link key={seminar.id} href={`/seminars/${seminar.id}`}>
              <Card className="hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {seminar.title}
                    </CardTitle>
                    <Badge variant={statusVariants[seminar.status]} className="shrink-0">
                      {statusLabels[seminar.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>{formatDate(seminar.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {formatTime(seminar.start_time)} - {formatTime(seminar.end_time)}
                    </span>
                  </div>
                  {seminar.venue && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{seminar.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>
                      {seminar.attendee_count} / {seminar.capacity}名
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
