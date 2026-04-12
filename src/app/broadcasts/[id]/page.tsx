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
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

interface IntegrityIssue {
  code: string
  severity: "info" | "warning" | "error"
  message: string
}

interface IntegrityReport {
  targetTotalAll: number
  targetActiveCount: number
  targetNonActiveCount: number
  broadcastSentCount: number
  broadcastFailedCount: number
  deliveryLogCount: number
  liveSentMatchCount: number
  liveUnsentCount: number
  issues: IntegrityIssue[]
}

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
  integrity?: IntegrityReport
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

interface VerifyResult {
  totalChecked: number
  reachableCount: number
  unreachableCount: number
  taggedCount: number
  errorTagName: string
  unreachable: Array<{
    id: string
    line_user_id: string
    display_name: string | null
    custom_name: string | null
    reason: string
  }>
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

  // バックフィル / 到達確認の状態
  const [backfilling, setBackfilling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

  // 過去の配信を個別メッセージ履歴に反映
  const handleBackfill = async () => {
    if (backfilling) return
    if (!confirm("この配信を友だち個別のメッセージ履歴に反映させます。既存のエントリはスキップされます。よろしいですか？")) return
    setBackfilling(true)
    try {
      const res = await fetch(`/api/broadcasts/${id}/backfill-logs`, { method: "POST" })
      if (res.ok) {
        const json = await res.json()
        setToast({
          type: "success",
          message: json.message || `${json.insertedCount || 0}件を履歴に反映しました`,
        })
        await fetchDetail()
      } else {
        const json = await res.json().catch(() => ({}))
        setToast({ type: "error", message: json.error || "履歴の反映に失敗しました" })
      }
    } catch {
      setToast({ type: "error", message: "履歴の反映に失敗しました" })
    } finally {
      setBackfilling(false)
    }
  }

  // 対象友だちの到達可否を LINE API で検証
  const handleVerify = async () => {
    if (verifying) return
    if (!confirm("LINE の getProfile API で対象友だちの到達可否を確認します。\n到達不可と判定された友だちには自動的に「送信エラー」タグを付与します（ステータスは変更しません）。\nメッセージは送信しません。実行しますか？")) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch(`/api/broadcasts/${id}/verify-delivery`, { method: "POST" })
      if (res.ok) {
        const json = await res.json()
        setVerifyResult(json as VerifyResult)
        setToast({
          type: "success",
          message: `到達可能 ${json.reachableCount} 人 / 到達不可 ${json.unreachableCount} 人`,
        })
        await fetchDetail()
      } else {
        const json = await res.json().catch(() => ({}))
        setToast({ type: "error", message: json.error || "到達確認に失敗しました" })
      }
    } catch {
      setToast({ type: "error", message: "到達確認に失敗しました" })
    } finally {
      setVerifying(false)
    }
  }

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

  const { broadcast, totalTarget, sentCount, unsentCount, sent, unsent, integrity } = detail
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

          {/* 過去配信向けのリカバリ操作 */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackfill}
              disabled={backfilling}
              className="flex-1 sm:flex-none"
            >
              {backfilling ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              履歴に反映（再読み込み）
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerify}
              disabled={verifying}
              className="flex-1 sm:flex-none"
            >
              {verifying ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              到達確認（送信エラーユーザー検出）
            </Button>
          </div>
          <div className="text-xs text-gray-400 leading-relaxed">
            <p>・「履歴に反映」は過去の配信を友だち個別のメッセージ履歴に復元します。重複は自動でスキップされます。</p>
            <p>・「到達確認」は LINE の getProfile で現在の到達可否を検証し、到達不可の友だちに自動で「送信エラー」タグを付与します（ステータスは変更しません、メッセージは送信しません）。</p>
          </div>
        </CardContent>
      </Card>

      {/* 到達確認の結果 */}
      {verifyResult && (
        <Card className="mb-4 border-blue-200 bg-blue-50/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">到達確認結果</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold">{verifyResult.totalChecked}</p>
                <p className="text-xs text-gray-500">確認数</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#06C755]">{verifyResult.reachableCount}</p>
                <p className="text-xs text-gray-500">到達可能</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{verifyResult.unreachableCount}</p>
                <p className="text-xs text-gray-500">到達不可</p>
              </div>
            </div>
            {verifyResult.taggedCount > 0 && (
              <p className="text-xs text-gray-600 text-center">
                {verifyResult.taggedCount}件に「{verifyResult.errorTagName}」タグを付与しました
              </p>
            )}
            {verifyResult.unreachable.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border border-red-100 bg-white p-2">
                <p className="text-xs font-semibold text-red-900 mb-1">到達不可ユーザー</p>
                {verifyResult.unreachable.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 text-xs py-1 px-1 border-b last:border-b-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="font-medium truncate">
                        {u.custom_name || u.display_name || "(名前なし)"}
                      </span>
                      <span className="text-gray-400 truncate">{u.reason}</span>
                    </div>
                    <Link
                      href={`/friends/${u.id}`}
                      className="text-blue-600 hover:underline shrink-0"
                    >
                      詳細
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* 整合性チェック（記述的な配信到達性チェック） */}
      {integrity && (
        <Card className="mb-5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold">整合性チェック</h3>
              <span className="text-xs text-gray-400">タグ → 配信 → 履歴 の突合</span>
            </div>

            {/* 数値テーブル */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded border p-2">
                <p className="text-gray-500">タグ/対象条件一致 (全状態)</p>
                <p className="text-lg font-bold">{integrity.targetTotalAll}</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-gray-500">うち active (配信対象)</p>
                <p className="text-lg font-bold" style={{ color: accentColor }}>
                  {integrity.targetActiveCount}
                </p>
              </div>
              <div className="rounded border p-2">
                <p className="text-gray-500">配信時の送信成功数</p>
                <p className="text-lg font-bold text-[#06C755]">
                  {integrity.broadcastSentCount}
                </p>
                {integrity.broadcastFailedCount > 0 && (
                  <p className="text-[10px] text-red-500">
                    失敗 {integrity.broadcastFailedCount}
                  </p>
                )}
              </div>
              <div className="rounded border p-2">
                <p className="text-gray-500">個別履歴の記録数</p>
                <p className="text-lg font-bold">
                  {integrity.deliveryLogCount}
                </p>
              </div>
            </div>

            {/* 非 active 内訳 */}
            {integrity.targetNonActiveCount > 0 && (
              <p className="text-xs text-gray-500">
                タグ/対象条件を満たす友だちのうち{" "}
                <span className="font-bold text-gray-700">
                  {integrity.targetNonActiveCount}人
                </span>
                {" "}はブロック/解除済みのため配信対象外です
              </p>
            )}

            {/* 警告 / OK メッセージ */}
            <div className="space-y-1.5 pt-1">
              {integrity.issues.map((issue, idx) => {
                const isError = issue.severity === "error"
                const isWarning = issue.severity === "warning"
                const isAllGreen = issue.code === "all_green"
                return (
                  <div
                    key={idx}
                    className={`flex gap-2 items-start rounded-md px-2.5 py-2 text-xs ${
                      isError
                        ? "bg-red-50 border border-red-100 text-red-900"
                        : isWarning
                        ? "bg-amber-50 border border-amber-100 text-amber-900"
                        : isAllGreen
                        ? "bg-green-50 border border-green-100 text-green-900"
                        : "bg-gray-50 border border-gray-100 text-gray-700"
                    }`}
                  >
                    {isAllGreen ? (
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600" />
                    ) : isError || isWarning ? (
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-500" />
                    )}
                    <p className="leading-relaxed">{issue.message}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
