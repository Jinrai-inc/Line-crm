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
  Send,
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
  const [paymentAutoEnabled, setPaymentAutoEnabled] = useState(false)
  const [paymentAutoMessage, setPaymentAutoMessage] = useState("")
  const [paymentAutoUrl, setPaymentAutoUrl] = useState("")
  const [paymentAutoButtonText, setPaymentAutoButtonText] = useState("")
  const [paymentAutoTitle, setPaymentAutoTitle] = useState("")

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
          setPaymentAutoEnabled(data.settings.payment_auto_enabled || false)
          setPaymentAutoMessage(data.settings.payment_auto_message || "")
          setPaymentAutoUrl(data.settings.payment_auto_url || "")
          setPaymentAutoButtonText(data.settings.payment_auto_button_text || "")
          setPaymentAutoTitle(data.settings.payment_auto_title || "")
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

  // 接続テスト（サーバーサイド経由）
  const handleTest = async () => {
    // キーの形式チェック
    if (secretKey && !secretKey.startsWith("sk_")) {
      setTestResult({
        status: "error",
        message: "シークレットキーは sk_live_ または sk_test_ で始まる必要があります。公開キーと逆に入力されていないか確認してください。",
      })
      return
    }
    if (publishableKey && !publishableKey.startsWith("pk_")) {
      setTestResult({
        status: "error",
        message: "公開キーは pk_live_ または pk_test_ で始まる必要があります。シークレットキーと逆に入力されていないか確認してください。",
      })
      return
    }

    setTestResult({ status: "testing" })
    try {
      // まず保存してからテスト
      const saveRes = await fetch("/api/stripe/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey, publishableKey, webhookSecret }),
      })
      if (!saveRes.ok) {
        setTestResult({ status: "error", message: "設定の保存に失敗しました。先に保存してください。" })
        return
      }

      const testRes = await fetch("/api/stripe/settings/test", { method: "POST" })
      const data = await testRes.json()

      if (testRes.ok && data.success) {
        setTestResult({ status: "success", message: data.message })
      } else {
        setTestResult({ status: "error", message: data.error || "接続テストに失敗しました" })
      }
    } catch {
      setTestResult({ status: "error", message: "接続テストに失敗しました" })
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
          paymentAutoEnabled,
          paymentAutoMessage,
          paymentAutoUrl,
          paymentAutoButtonText,
          paymentAutoTitle,
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
        {/* 入金後自動メッセージ設定 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Send className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              入金後自動メッセージ
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Stripeで入金が確認された際に、LINEで会議URLなどを自動送信します。
          </p>

          {/* 有効/無効トグル */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPaymentAutoEnabled(!paymentAutoEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                paymentAutoEnabled ? "bg-green-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  paymentAutoEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {paymentAutoEnabled ? "有効" : "無効"}
            </span>
          </div>

          {paymentAutoEnabled && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {/* タイトル */}
              <div>
                <label
                  htmlFor="paymentAutoTitle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  タイトル
                </label>
                <input
                  id="paymentAutoTitle"
                  type="text"
                  value={paymentAutoTitle}
                  onChange={(e) => setPaymentAutoTitle(e.target.value)}
                  placeholder="お支払い確認"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">空欄の場合は「お支払い確認」が使用されます</p>
              </div>

              {/* メッセージ本文 */}
              <div>
                <label
                  htmlFor="paymentAutoMessage"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  メッセージ本文
                </label>
                <textarea
                  id="paymentAutoMessage"
                  value={paymentAutoMessage}
                  onChange={(e) => setPaymentAutoMessage(e.target.value)}
                  placeholder="お支払いありがとうございます。以下のURLから会議にご参加ください。"
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
                />
                <p className="mt-1 text-xs text-gray-400">空欄の場合はデフォルトメッセージが使用されます</p>
              </div>

              {/* 会議URL */}
              <div>
                <label
                  htmlFor="paymentAutoUrl"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ボタンのリンク先URL
                </label>
                <input
                  id="paymentAutoUrl"
                  type="url"
                  value={paymentAutoUrl}
                  onChange={(e) => setPaymentAutoUrl(e.target.value)}
                  placeholder="https://zoom.us/j/... や https://meet.google.com/..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Zoom、Google Meet、予約ページ等のURLを入力してください</p>
              </div>

              {/* ボタンテキスト */}
              <div>
                <label
                  htmlFor="paymentAutoButtonText"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ボタンテキスト
                </label>
                <input
                  id="paymentAutoButtonText"
                  type="text"
                  value={paymentAutoButtonText}
                  onChange={(e) => setPaymentAutoButtonText(e.target.value)}
                  placeholder="会議URLを開く"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">空欄の場合は「会議URLを開く」が使用されます</p>
              </div>

              {/* プレビュー */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-medium text-green-800 mb-2">LINEメッセージプレビュー</p>
                <div className="rounded-lg bg-white border border-green-100 p-3 space-y-2">
                  <p className="text-sm font-bold text-green-600">
                    {paymentAutoTitle || "お支払い確認"}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {paymentAutoMessage || "お支払いありがとうございます。以下のURLから会議にご参加ください。"}
                  </p>
                  {paymentAutoUrl && (
                    <div className="rounded-md bg-green-500 text-white text-center py-2 text-sm font-medium">
                      {paymentAutoButtonText || "会議URLを開く"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
