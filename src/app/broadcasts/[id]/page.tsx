"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Megaphone,
  User,
} from "lucide-react"

interface BroadcastDetail {
  broadcast: {
    id: string
    title: string | null
    message_text: string | null
    target_type: string
    status: string
    sent_count: number | null
    failed_count: number | null
    sent_at: string | null
    created_at: string
  }
  totalTarget: number
  sentCount: number
  unsentCount: number
  sent: Friend[]
  unsent: Friend[]
}

interface Friend {
  id: string
  line_user_id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
  status: string
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  all: "全員配信",
  tag: "タグ指定",
  seminar: "セミナー参加者",
}

export default function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const accentColor = useAccentColor()

  const [detail, setDetail] = useState<BroadcastDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"unsent" | "sent">("unsent")

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/broadcasts/${id}`)
      if (res.ok) {
        const json = await res.json()
        setDetail(json.data as BroadcastDetail)
      }
    } catch {
      console.error("配信詳細の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="配信詳細" description="" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout>
        <PageHeader title="配信詳細" description="" />
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">配信が見つかりません</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/broadcasts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                配信一覧に戻る
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  const { broadcast, totalTarget, sentCount, unsentCount, sent, unsent } = detail
  const formattedSentAt = broadcast.sent_at
    ? new Date(broadcast.sent_at).toLocaleString("ja-JP")
    : "-"

  const renderFriendTable = (friends: Friend[], emptyMessage: string) => {
    if (friends.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </CardContent>
        </Card>
      )
    }
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LINE表示名</TableHead>
                <TableHead>表示名（カスタム）</TableHead>
                <TableHead className="w-24 text-right">友だち詳細</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {friends.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {f.picture_url && (
                          <AvatarImage src={f.picture_url} alt={f.display_name || ""} />
                        )}
                        <AvatarFallback>
                          {(f.display_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {f.display_name || "名前なし"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {f.custom_name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/friends/${f.id}`}>
                        <User className="h-3 w-3 mr-1" />
                        詳細
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title={broadcast.title || "配信詳細"}
        description="送信済み / 未送信 の内訳を確認できます"
        action={
          <Button variant="outline" asChild>
            <Link href="/broadcasts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              配信一覧
            </Link>
          </Button>
        }
      />

      {/* 概要 */}
      <Card className="mb-4">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {TARGET_TYPE_LABELS[broadcast.target_type] || broadcast.target_type}
            </Badge>
            <span className="text-xs text-gray-500">
              送信日時: {formattedSentAt}
            </span>
          </div>
          {broadcast.message_text && (
            <div className="border-l-4 pl-3 py-1" style={{ borderColor: accentColor }}>
              <p className="text-xs text-gray-500 mb-1">メッセージ本文</p>
              <p className="text-sm whitespace-pre-wrap">{broadcast.message_text}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Users size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTarget}</p>
              <p className="text-xs text-gray-500">対象人数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#06C755]/10">
              <CheckCircle2 size={20} className="text-[#06C755]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#06C755]">{sentCount}</p>
              <p className="text-xs text-gray-500">送信済み</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{unsentCount}</p>
              <p className="text-xs text-gray-500">未送信</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タブ: 未送信 / 送信済み */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "unsent" | "sent")}>
        <TabsList>
          <TabsTrigger value="unsent" className="gap-1.5">
            <AlertCircle className="h-4 w-4" />
            未送信 ({unsentCount})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            送信済み ({sentCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unsent" className="mt-4">
          {unsentCount > 0 && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-900">
              <span className="font-semibold">{unsentCount}人</span>
              {" に配信が届いていません。友だち詳細ページから個別にメッセージを送るか、該当タグを付け直して再配信してください。"}
            </div>
          )}
          {renderFriendTable(unsent, "未送信のユーザーはいません。全員に届いています。")}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {renderFriendTable(sent, "まだ送信済みのユーザーがいません")}
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}
