"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { PageHeader } from "@/components/layout/page-header"
import {
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"

interface CalendarSettings {
  id: string
  calendar_id: string
  sync_enabled: boolean
  created_at: string
  updated_at: string
}

export default function GoogleCalendarSettingsPage() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [showTestUserGuide, setShowTestUserGuide] = useState(false)

  // Check URL params for success/error messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "connected") {
      setToast({ type: "success", message: "Googleカレンダーを連携しました" })
      window.history.replaceState({}, "", "/settings/google-calendar")
    }
    const error = params.get("error")
    if (error) {
      const messages: Record<string, string> = {
        no_code: "認証コードが取得できませんでした",
        no_tokens: "トークンの取得に失敗しました",
        unauthorized: "ログインしてください",
        no_org: "組織情報が見つかりません",
        save_failed: "設定の保存に失敗しました",
        access_denied: "Googleアカウントへのアクセスが拒否されました。テストユーザーとして登録されていない可能性があります。",
        google_error: "Google認証でエラーが発生しました",
        unknown: "不明なエラーが発生しました",
      }
      setToast({
        type: "error",
        message: messages[error] || "エラーが発生しました",
      })
      if (error === "access_denied") {
        setShowTestUserGuide(true)
      }
      window.history.replaceState({}, "", "/settings/google-calendar")
    }
  }, [])

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/google/calendar/settings")
        if (res.ok) {
          const data = await res.json()
          setSettings(data.settings || null)
        }
      } catch (error) {
        console.error("設定の取得に失敗:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleToggleActive = async () => {
    if (!settings) return
    setToggling(true)
    try {
      const res = await fetch("/api/google/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_enabled: !settings.sync_enabled }),
      })
      if (!res.ok) throw new Error()
      setSettings({ ...settings, sync_enabled: !settings.sync_enabled })
      setToast({
        type: "success",
        message: settings.sync_enabled
          ? "カレンダー連携を無効にしました"
          : "カレンダー連携を有効にしました",
      })
    } catch {
      setToast({ type: "error", message: "更新に失敗しました" })
    } finally {
      setToggling(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Googleカレンダー連携を解除しますか？")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/google/calendar/settings", {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setSettings(null)
      setToast({ type: "success", message: "連携を解除しました" })
    } catch {
      setToast({ type: "error", message: "連携解除に失敗しました" })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader
        title="Googleカレンダー連携"
        description="Googleカレンダーとの同期を設定します"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
          </div>
        ) : settings ? (
          /* Connected state */
          <div className="space-y-6">
            {/* Connection status */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    接続状況
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {settings.sync_enabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600">
                          連携中
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          無効
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">カレンダーID</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {settings.calendar_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">連携日時</span>
                  <span className="text-gray-900">
                    {new Date(settings.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  settings.sync_enabled
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {toggling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {settings.sync_enabled ? "無効にする" : "有効にする"}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                連携を解除
              </button>
            </div>
          </div>
        ) : (
          /* Not connected state */
          <div className="space-y-4">
            {/* テストユーザー登録ガイド */}
            {showTestUserGuide && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900">
                      Google審査が未完了のため、テストユーザーの登録が必要です
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      以下の手順でテストユーザーを追加してください：
                    </p>
                    <ol className="text-sm text-amber-800 mt-2 list-decimal list-inside space-y-1">
                      <li>
                        <a
                          href="https://console.cloud.google.com/apis/credentials/consent"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium hover:text-amber-900"
                        >
                          Google Cloud Console の OAuth同意画面
                        </a>
                        を開く
                      </li>
                      <li>「テストユーザー」セクションの「+ ADD USERS」をクリック</li>
                      <li>連携したいGoogleアカウントのメールアドレスを追加</li>
                      <li>保存後、再度「Googleカレンダーを連携する」をクリック</li>
                    </ol>
                    <p className="text-xs text-amber-600 mt-3">
                      ※ Google審査を完了すると、すべてのGoogleアカウントで利用可能になります
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-50 mb-4">
                <Calendar className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Googleカレンダー未連携
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Googleカレンダーと連携すると、予定の管理や同期ができます。
              </p>
              <a
                href="/api/google/auth"
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Googleカレンダーを連携する
              </a>

              {!showTestUserGuide && (
                <button
                  onClick={() => setShowTestUserGuide(true)}
                  className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  連携でエラーが出る場合はこちら
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
