"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { PageHeader } from "@/components/layout/page-header"
import {
  Copy,
  Check,
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

interface TestResult {
  status: "idle" | "testing" | "success" | "error"
  message?: string
  botName?: string
}

export default function LineSettingsPage() {
  const [channelName, setChannelName] = useState("")
  const [channelId, setChannelId] = useState("")
  const [channelSecret, setChannelSecret] = useState("")
  const [channelAccessToken, setChannelAccessToken] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [testResult, setTestResult] = useState<TestResult>({ status: "idle" })

  // 初期データ取得
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/line")
        if (!res.ok) throw new Error("取得に失敗しました")
        const data = await res.json()
        if (data.lineAccount) {
          setChannelName(data.lineAccount.channel_name || "")
          setChannelId(data.lineAccount.channel_id || "")
          setChannelSecret(data.lineAccount.channel_secret || "")
          setChannelAccessToken(data.lineAccount.channel_access_token || "")
        }
        setWebhookUrl(data.webhookUrl || "")
      } catch (error) {
        console.error("設定の取得に失敗:", error)
        setWebhookUrl(
          `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/webhook/line`
        )
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

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

  // 接続テスト
  const handleTest = async () => {
    setTestResult({ status: "testing" })
    try {
      const res = await fetch("/api/settings/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelAccessToken }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({
          status: "success",
          message: "接続に成功しました",
          botName: data.botName,
        })
      } else {
        setTestResult({
          status: "error",
          message: data.error || "接続テストに失敗しました",
        })
      }
    } catch {
      setTestResult({
        status: "error",
        message: "接続テストに失敗しました",
      })
    }
  }

  // 保存
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          channelId,
          channelSecret,
          channelAccessToken,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToast({ type: "success", message: "LINE連携設定を保存しました" })
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

  if (loading) {
    return (
      <AppLayout>
        <ModuleAccentBar />
        <PageHeader title="LINE連携設定" description="LINE公式アカウントとの連携を設定します" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader title="LINE連携設定" description="LINE公式アカウントとの連携を設定します" />

      <div className="max-w-2xl space-y-6">
        {/* Webhook URL インフォカード */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900">
                Webhook URL
              </h3>
              <p className="mt-1 text-xs text-blue-700">
                LINE Developersコンソールの「Webhook URL」に以下のURLを設定してください。
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded bg-white px-3 py-1.5 text-sm text-blue-900 border border-blue-200">
                  {webhookUrl}
                </code>
                <button
                  onClick={handleCopyWebhookUrl}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-white border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
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
                </button>
              </div>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                LINE Developersコンソールを開く
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* フォームカード */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            チャネル情報
          </h2>
          <div className="space-y-4">
            {/* チャネル名 */}
            <div>
              <label
                htmlFor="channelName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                チャネル名
              </label>
              <input
                id="channelName"
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="例: マイLINE公式アカウント"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            {/* チャネルID */}
            <div>
              <label
                htmlFor="channelId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                チャネルID
              </label>
              <input
                id="channelId"
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="例: 1234567890"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            {/* チャネルシークレット */}
            <div>
              <label
                htmlFor="channelSecret"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                チャネルシークレット
              </label>
              <input
                id="channelSecret"
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                placeholder="チャネルシークレットを入力"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            {/* チャネルアクセストークン */}
            <div>
              <label
                htmlFor="channelAccessToken"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                チャネルアクセストークン
              </label>
              <textarea
                id="channelAccessToken"
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
                placeholder="チャネルアクセストークン（長期）を入力"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* 接続テスト */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={!channelAccessToken || testResult.status === "testing"}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testResult.status === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    テスト中...
                  </>
                ) : (
                  "接続テスト"
                )}
              </button>

              {/* テスト結果のインライン表示 */}
              {testResult.status === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {testResult.message}
                    {testResult.botName && (
                      <span className="font-semibold ml-1">
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
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#06C755" }}
              onMouseEnter={(e) =>
                !saving &&
                ((e.currentTarget.style.backgroundColor = "#04A847"))
              }
              onMouseLeave={(e) =>
                !saving &&
                ((e.currentTarget.style.backgroundColor = "#06C755"))
              }
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </button>
          </div>
        </div>
      </div>

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
