"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  RefreshCwIcon,
  Loader2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────

interface Friend {
  id: string
  display_name: string | null
  custom_name: string | null
}

interface Payment {
  id: string
  item_name: string
  amount: number
  currency: string
  status: string
  payment_method: string | null
  paid_at: string | null
  refunded_at: string | null
  created_at: string
  friends: Friend | null
}

interface PaymentsResponse {
  data: Payment[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "未払い", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "支払済", color: "bg-green-100 text-green-800" },
  refunded: { label: "返金済", color: "bg-blue-100 text-blue-800" },
  failed: { label: "失敗", color: "bg-red-100 text-red-800" },
}

const PAGE_SIZE = 20

// ── Main Page Component ────────────────────────────────────────────────

export default function PaymentsPage() {
  const accentColor = useAccentColor()
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Stripe 同期（pending 決済を Stripe 側の最新ステータスに揃える）
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null)

  // ── Fetch payments ──────────────────────────────────────────────────

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/payments?${params}`)
      if (!res.ok) throw new Error("Fetch failed")
      const json: PaymentsResponse = await res.json()
      setPayments(json.data)
      setTotal(json.total)
      setTotalPages(json.totalPages)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // ── 手動でステータスを変更（Stripe同期が効かない場合の最終手段） ──
  const handleManualStatusChange = async (paymentId: string, newStatus: string) => {
    const label =
      newStatus === "paid"
        ? "支払済"
        : newStatus === "refunded"
        ? "返金済"
        : newStatus === "failed"
        ? "失敗"
        : "未払い"
    if (!confirm(`この決済を「${label}」に変更してもよろしいですか？`)) return
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSyncResult({
          type: "success",
          message: `決済ステータスを「${label}」に変更しました`,
        })
        await fetchPayments()
      } else {
        setSyncResult({
          type: "error",
          message: data.error || "更新に失敗しました",
        })
      }
    } catch {
      setSyncResult({ type: "error", message: "更新処理中にエラーが発生しました" })
    }
  }

  // ── Stripe 同期 ──────────────────────────────────────────────
  const handleStripeSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/payments/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.success) {
        setSyncResult({
          type: "success",
          message:
            data.updated > 0
              ? `${data.updated}件の決済ステータスを更新しました (${data.checked}件チェック)`
              : data.message || "更新対象の決済はありませんでした",
        })
        // 一覧を再取得して反映
        await fetchPayments()
      } else {
        setSyncResult({
          type: "error",
          message: data.error || "同期に失敗しました",
        })
      }
    } catch {
      setSyncResult({ type: "error", message: "同期処理中にエラーが発生しました" })
    } finally {
      setSyncing(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  const formatAmount = (amount: number, currency: string) => {
    if (currency === "jpy") {
      return `¥${amount.toLocaleString()}`
    }
    return `${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const getFriendName = (payment: Payment) => {
    if (!payment.friends) return "-"
    return payment.friends.custom_name || payment.friends.display_name || "-"
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <PageHeader
        title="支払い一覧"
        description="Stripe決済の管理"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleStripeSync}
            disabled={syncing}
            title="未払いの決済をStripe側の最新ステータスに同期します"
          >
            {syncing ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            {syncing ? "同期中..." : "Stripeと同期"}
          </Button>
        }
      />

      {/* ── Stripe 同期 結果バナー ─────────────────────────────── */}
      {syncResult && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            syncResult.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {syncResult.type === "success" ? (
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="flex-1 whitespace-pre-wrap">{syncResult.message}</div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            閉じる
          </button>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="説明で検索..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList>
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="pending">未払い</TabsTrigger>
              <TabsTrigger value="paid">支払済</TabsTrigger>
              <TabsTrigger value="refunded">返金済</TabsTrigger>
              <TabsTrigger value="failed">失敗</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Desktop Table ───────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>説明</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>支払日</TableHead>
                  <TableHead>友だち</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-12 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))
                  : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <CreditCardIcon className="size-8" />
                            <p>支払いが見つかりませんでした</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : payments.map((payment) => {
                      const statusInfo = STATUS_MAP[payment.status] || { label: payment.status, color: "bg-gray-100 text-gray-800" }
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.item_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatAmount(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color} variant="secondary">
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {formatDate(payment.paid_at)}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {getFriendName(payment)}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {formatDate(payment.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs font-normal text-gray-500">
                                  ステータスを手動変更
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {payment.status !== "paid" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleManualStatusChange(payment.id, "paid")
                                    }
                                  >
                                    支払済にする
                                  </DropdownMenuItem>
                                )}
                                {payment.status !== "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleManualStatusChange(payment.id, "pending")
                                    }
                                  >
                                    未払いに戻す
                                  </DropdownMenuItem>
                                )}
                                {payment.status !== "refunded" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleManualStatusChange(payment.id, "refunded")
                                    }
                                  >
                                    返金済にする
                                  </DropdownMenuItem>
                                )}
                                {payment.status !== "failed" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleManualStatusChange(payment.id, "failed")
                                    }
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    失敗にする
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile Card Layout ──────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          : payments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <CreditCardIcon className="size-8" />
                    <p>支払いが見つかりませんでした</p>
                  </div>
                </CardContent>
              </Card>
            )
          : payments.map((payment) => {
              const statusInfo = STATUS_MAP[payment.status] || { label: payment.status, color: "bg-gray-100 text-gray-800" }
              return (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {payment.item_name}
                          </span>
                          <Badge className={statusInfo.color} variant="secondary">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-lg font-mono font-semibold mt-1">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>友だち: {getFriendName(payment)}</span>
                          <span>支払日: {formatDate(payment.paid_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            全{total}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)}件
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis")
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? "default" : "outline"}
                    size="icon"
                    className="size-8"
                    style={page === item ? { backgroundColor: accentColor } : undefined}
                    onClick={() => setPage(item as number)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
