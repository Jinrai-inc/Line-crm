"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import {
  Copy,
  Check,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

interface TestResult {
  status: "idle" | "testing" | "success" | "error"
  message?: string
}

export default function StripeSettingsPage() {
  const [secretKey, setSecretKey] = useState("")
  const [publishableKey, setPublishableKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
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
        const res = await fetch("/api/stripe/settings")
        if (!res.ok) throw new Error("取得に失敗しました")
        const data = await res.json()
        if (data.settings) {
          setSecretKey(data.settings.stripe_secret_key || "")
          setPublishableKey(data.settings.stripe_publishable_key || "")
          setWebhookSecret(data.settings.stripe_webhook_secret || "")
        }
        setWebhookUrl(
          `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/stripe/webhook`
        )
      } catch (error) {
        console.error("Stripe設定の取得に失敗:", error)
        setWebhookUrl(
          `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/stripe/webhook`
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
      // 一時的にStripeクライアントで顧客一覧を取得してテスト
      const res = await fetch("/api/stripe/settings")
      if (!res.ok) throw new Error("設定取得失敗")

      // secretKeyを使って直接テストリクエスト
      const testRes = await fetch("https://api.stripe.com/v1/customers?limit=1", {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      })

      if (testRes.ok) {
        setTestResult({
          status: "success",
          message: "Stripeとの接続に成功しました",
        })
      } else {
        const errorData = await testRes.json()
        setTestResult({
          status: "error",
          message: errorData.error?.message || "接続テストに失敗しました",
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
      const res = await fetch("/api/stripe/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretKey,
          publishableKey,
          webhookSecret,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setToast({ type: "success", message: "Stripe連携設定を保存しました" })
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
        <PageHeader title="Stripe連携設定" description="Stripe決済の連携を設定します" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader title="Stripe連携設定" description="Stripe決済の連携を設定します" />

      <div className="max-w-2xl space-y-6">
        {/* Webhook URL インフォカード */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-purple-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-purple-900">
                Webhook URL
              </h3>
              <p className="mt-1 text-xs text-purple-700">
                Stripeダッシュボードの「Webhook」設定に以下のURLを登録してください。
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded bg-white px-3 py-1.5 text-sm text-purple-900 border border-purple-200">
                  {webhookUrl}
                </code>
                <button
                  onClick={handleCopyWebhookUrl}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-white border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
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
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 underline"
              >
                Stripeダッシュボードを開く
              </a>
            </div>
          </div>
        </div>

        {/* フォームカード */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            APIキー情報
          </h2>
          <div className="space-y-4">
            {/* シークレットキー */}
            <div>
              <label
                htmlFor="secretKey"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                シークレットキー
              </label>
              <input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sk_live_... または sk_test_..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* 公開キー */}
            <div>
              <label
                htmlFor="publishableKey"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                公開キー
              </label>
              <input
                id="publishableKey"
                type="text"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_live_... または pk_test_..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Webhookシークレット */}
            <div>
              <label
                htmlFor="webhookSecret"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Webhookシークレット
              </label>
              <input
                id="webhookSecret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* 接続テスト */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={!secretKey || testResult.status === "testing"}
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
                  <span>{testResult.message}</span>
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
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
