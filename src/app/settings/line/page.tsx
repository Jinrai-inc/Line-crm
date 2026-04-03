"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Copy,
  Check,
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
} from "lucide-react"

interface LineAccount {
  id: string
  channel_name: string
  channel_id: string
  channel_secret: string
  channel_access_token: string
  webhook_active?: boolean
  created_at?: string
  updated_at?: string
}

interface FormData {
  id?: string
  channelName: string
  channelId: string
  channelSecret: string
  channelAccessToken: string
  webhookActive: boolean
}

const emptyForm: FormData = {
  channelName: "",
  channelId: "",
  channelSecret: "",
  channelAccessToken: "",
  webhookActive: true,
}

interface TestResult {
  status: "idle" | "testing" | "success" | "error"
  message?: string
  botName?: string
}

export default function LineSettingsPage() {
  const [accounts, setAccounts] = useState<LineAccount[]>([])
  const [webhookUrl, setWebhookUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [formData, setFormData] = useState<FormData>(emptyForm)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LineAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Connection test per account
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  // Sync state per account
  const [syncingAccounts, setSyncingAccounts] = useState<Record<string, boolean>>({})
  const [syncResults, setSyncResults] = useState<Record<string, { type: "success" | "error"; message: string } | null>>({})

  // 初期データ取得
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/line")
      if (!res.ok) throw new Error("取得に失敗しました")
      const data = await res.json()
      setAccounts(data.lineAccounts || [])
      setWebhookUrl(
        data.webhookUrl ||
          `${window.location.origin}/api/webhook/line`
      )
    } catch (error) {
      console.error("設定の取得に失敗:", error)
      setWebhookUrl(
        `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/webhook/line`
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // トースト自動消去
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Webhook URLコピー
  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setToast({ type: "error", message: "コピーに失敗しました" })
    }
  }

  // ダイアログを開く（新規）
  const openAddDialog = () => {
    setFormData(emptyForm)
    setDialogMode("add")
    setDialogOpen(true)
  }

  // ダイアログを開く（編集）
  const openEditDialog = (account: LineAccount) => {
    setFormData({
      id: account.id,
      channelName: account.channel_name,
      channelId: account.channel_id,
      channelSecret: account.channel_secret,
      channelAccessToken: account.channel_access_token,
      webhookActive: account.webhook_active ?? true,
    })
    setDialogMode("edit")
    setDialogOpen(true)
  }

  // 保存
  const handleSave = async () => {
    if (
      !formData.channelName ||
      !formData.channelId ||
      !formData.channelSecret ||
      !formData.channelAccessToken
    ) {
      setToast({ type: "error", message: "全ての項目を入力してください" })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.id,
          channelName: formData.channelName,
          channelId: formData.channelId,
          channelSecret: formData.channelSecret,
          channelAccessToken: formData.channelAccessToken,
          webhookActive: formData.webhookActive,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToast({
          type: "success",
          message:
            dialogMode === "add"
              ? "LINEアカウントを追加しました"
              : "LINEアカウント設定を更新しました",
        })
        setDialogOpen(false)
        await fetchAccounts()
      } else {
        setToast({
          type: "error",
          message: data.error || "保存に失敗しました",
        })
      }
    } catch {
      setToast({ type: "error", message: "保存に失敗しました" })
    } finally {
      setSaving(false)
    }
  }

  // 削除確認ダイアログを開く
  const openDeleteDialog = (account: LineAccount) => {
    setDeleteTarget(account)
    setDeleteDialogOpen(true)
  }

  // 削除実行
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/settings/line?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (res.ok && data.success) {
        setToast({ type: "success", message: "LINEアカウントを削除しました" })
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        await fetchAccounts()
      } else {
        setToast({
          type: "error",
          message: data.error || "削除に失敗しました",
        })
      }
    } catch {
      setToast({ type: "error", message: "削除に失敗しました" })
    } finally {
      setDeleting(false)
    }
  }

  // 接続テスト
  const handleTest = async (account: LineAccount) => {
    setTestResults((prev) => ({
      ...prev,
      [account.id]: { status: "testing" },
    }))
    try {
      const res = await fetch("/api/settings/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: account.channel_access_token,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResults((prev) => ({
          ...prev,
          [account.id]: {
            status: "success",
            message: "接続に成功しました",
            botName: data.botName,
          },
        }))
      } else {
        setTestResults((prev) => ({
          ...prev,
          [account.id]: {
            status: "error",
            message: data.error || "接続テストに失敗しました",
          },
        }))
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          status: "error",
          message: "接続テストに失敗しました",
        },
      }))
    }
  }

  // Webhook Active トグル
  const handleToggleWebhook = async (account: LineAccount) => {
    const newActive = !(account.webhook_active ?? true)
    try {
      const res = await fetch("/api/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          channelName: account.channel_name,
          channelId: account.channel_id,
          channelSecret: account.channel_secret,
          channelAccessToken: account.channel_access_token,
          webhookActive: newActive,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToast({
          type: "success",
          message: newActive
            ? "Webhookを有効にしました"
            : "Webhookを無効にしました",
        })
        await fetchAccounts()
      } else {
        setToast({
          type: "error",
          message: data.error || "更新に失敗しました",
        })
      }
    } catch {
      setToast({ type: "error", message: "更新に失敗しました" })
    }
  }

  // 友だち同期
  const handleSync = async (account: LineAccount) => {
    setSyncingAccounts((prev) => ({ ...prev, [account.id]: true }))
    setSyncResults((prev) => ({ ...prev, [account.id]: null }))
    try {
      const res = await fetch("/api/settings/line/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineAccountId: account.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSyncResults((prev) => ({
          ...prev,
          [account.id]: {
            type: "success",
            message: data.message || `${data.imported}人をインポートしました`,
          },
        }))
        setToast({ type: "success", message: data.message })
      } else {
        setSyncResults((prev) => ({
          ...prev,
          [account.id]: { type: "error", message: data.error || "同期に失敗しました" },
        }))
        setToast({ type: "error", message: data.error || "同期に失敗しました" })
      }
    } catch {
      setSyncResults((prev) => ({
        ...prev,
        [account.id]: { type: "error", message: "同期に失敗しました" },
      }))
      setToast({ type: "error", message: "同期に失敗しました" })
    } finally {
      setSyncingAccounts((prev) => ({ ...prev, [account.id]: false }))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <ModuleAccentBar />
        <PageHeader
          title="LINE連携設定"
          description="LINE公式アカウントとの連携を設定します"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader
        title="LINE連携設定"
        description="LINE公式アカウントとの連携を設定します"
      />

      <div className="max-w-4xl space-y-6">
        {/* Webhook URL インフォカード */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Webhook URL
              </h3>
              <p className="mt-1 text-xs text-blue-700">
                LINE
                Developersコンソールの「Webhook
                URL」に以下のURLを設定してください。
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-900">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhookUrl}
                  className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      コピー済
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      コピー
                    </>
                  )}
                </Button>
              </div>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 underline hover:text-blue-800"
              >
                LINE Developersコンソールを開く
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ヘッダー行: タイトル + 追加ボタン */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            登録済みアカウント
            {accounts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({accounts.length}件)
              </span>
            )}
          </h2>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            アカウントを追加
          </Button>
        </div>

        {/* アカウント一覧 */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "#06C75520" }}
              >
                <Plus className="h-6 w-6" style={{ color: "#06C755" }} />
              </div>
              <p className="text-sm font-medium text-gray-900">
                LINEアカウントが登録されていません
              </p>
              <p className="mt-1 text-sm text-gray-500">
                「アカウントを追加」ボタンからLINE公式アカウントを登録してください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const testResult = testResults[account.id] || {
                status: "idle",
              }
              const isWebhookActive = account.webhook_active ?? true

              return (
                <Card key={account.id} className="overflow-hidden">
                  {/* LINE green accent top border */}
                  <div className="h-1" style={{ backgroundColor: "#06C755" }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {account.channel_name}
                        </CardTitle>
                        <Badge
                          variant={isWebhookActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isWebhookActive ? "有効" : "無効"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(account)}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(account)}
                          title="削除"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* アカウント情報 */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          チャネルID
                        </p>
                        <p className="mt-0.5 text-sm font-mono text-gray-900">
                          {account.channel_id}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                        <div>
                          <p className="text-xs font-medium text-gray-500">
                            Webhook
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            {isWebhookActive ? (
                              <Wifi
                                className="h-4 w-4"
                                style={{ color: "#06C755" }}
                              />
                            ) : (
                              <WifiOff className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">
                              {isWebhookActive ? "受信中" : "停止中"}
                            </span>
                          </div>
                        </div>
                        <Switch
                          checked={isWebhookActive}
                          onCheckedChange={() =>
                            handleToggleWebhook(account)
                          }
                        />
                      </div>
                    </div>

                    {/* 接続テスト・友だち同期 */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(account)}
                        disabled={testResult.status === "testing"}
                      >
                        {testResult.status === "testing" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            テスト中...
                          </>
                        ) : (
                          "接続テスト"
                        )}
                      </Button>

                      {testResult.status === "success" && (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            {testResult.message}
                            {testResult.botName && (
                              <span className="ml-1 font-semibold">
                                (Bot名: {testResult.botName})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {testResult.status === "error" && (
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <XCircle className="h-4 w-4" />
                          <span>{testResult.message}</span>
                        </div>
                      )}

                      <div className="ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(account)}
                          disabled={syncingAccounts[account.id]}
                        >
                          {syncingAccounts[account.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              同期中...
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              友だち同期
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {syncResults[account.id] && (
                      <div className={`flex items-center gap-2 text-sm border-t border-gray-100 pt-3 ${
                        syncResults[account.id]!.type === "success" ? "text-green-700" : "text-red-700"
                      }`}>
                        {syncResults[account.id]!.type === "success" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span>{syncResults[account.id]!.message}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? "LINEアカウントを追加"
                : "LINEアカウントを編集"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "LINE Developersコンソールから取得した情報を入力してください。"
                : "アカウント情報を更新します。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dialog-channelName">チャネル名</Label>
              <Input
                id="dialog-channelName"
                value={formData.channelName}
                onChange={(e) =>
                  setFormData({ ...formData, channelName: e.target.value })
                }
                placeholder="例: マイLINE公式アカウント"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-channelId">チャネルID</Label>
              <Input
                id="dialog-channelId"
                value={formData.channelId}
                onChange={(e) =>
                  setFormData({ ...formData, channelId: e.target.value })
                }
                placeholder="例: 1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-channelSecret">チャネルシークレット</Label>
              <Input
                id="dialog-channelSecret"
                type="password"
                value={formData.channelSecret}
                onChange={(e) =>
                  setFormData({ ...formData, channelSecret: e.target.value })
                }
                placeholder="チャネルシークレットを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-channelAccessToken">
                チャネルアクセストークン
              </Label>
              <Textarea
                id="dialog-channelAccessToken"
                value={formData.channelAccessToken}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    channelAccessToken: e.target.value,
                  })
                }
                placeholder="チャネルアクセストークン（長期）を入力"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Webhook受信
                </p>
                <p className="text-xs text-gray-500">
                  このアカウントでWebhookを受信します
                </p>
              </div>
              <Switch
                checked={formData.webhookActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, webhookActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : dialogMode === "add" ? (
                "追加"
              ) : (
                "更新"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>アカウントの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.channel_name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
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
