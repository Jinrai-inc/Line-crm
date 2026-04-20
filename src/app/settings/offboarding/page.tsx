"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Download,
  ExternalLink,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react"

interface ChecklistItem {
  id: string
  category: string
  title: string
  description: string
  link?: { href: string; label: string; external?: boolean }
}

const CHECKLIST: ChecklistItem[] = [
  // ── ステップ0: 事前作業 ───────────────────────────────
  {
    id: "backup-full",
    category: "事前準備",
    title: "全データを一括エクスポートする",
    description:
      "友だち・タグ・セミナー・参加履歴・支払い・配信・アンケート・メッセージログを1つのExcelファイルで一括ダウンロード。ProLine等への移行や保管用のバックアップとして使います。",
    link: { href: "#full-export", label: "下の「全データをダウンロード」ボタンへ" },
  },
  {
    id: "backup-friends",
    category: "事前準備",
    title: "友だちCSVを単独でエクスポート (任意)",
    description:
      "他CRMの友だちインポート機能を使う場合、専用の形式で友だちのみエクスポートできます。",
    link: { href: "/friends", label: "友だち一覧ページを開く" },
  },
  {
    id: "close-seminars",
    category: "事前準備",
    title: "進行中のセミナーを締切/中止にする",
    description:
      "解約後は申込や決済を受け付けられなくなります。申込受付中のセミナーを「締切」または「中止」に変更してください。",
    link: { href: "/seminars", label: "セミナー管理を開く" },
  },
  {
    id: "pending-payments",
    category: "事前準備",
    title: "進行中の決済 (未払い) を整理する",
    description:
      "未払い状態の決済が残っていないか確認し、必要ならStripeダッシュボードから手動でキャンセルしてください。",
    link: { href: "/payments", label: "支払い一覧を開く" },
  },
  {
    id: "scheduled-broadcasts",
    category: "事前準備",
    title: "予約済みの配信を確認/削除する",
    description:
      "解約後は予約配信が送信されなくなります。送信予定を見直して、不要なものは削除してください。",
    link: { href: "/broadcasts", label: "配信管理を開く" },
  },
  // ── ステップ1: Stripe ─────────────────────────────────
  {
    id: "stripe-webhook-delete",
    category: "Stripe側",
    title: "Stripe Webhook エンドポイントを削除",
    description:
      "Stripe Dashboard → 開発者 → Webhooks から、本CRMのWebhook URLを削除してください。残したままだとStripeから本CRMへ永遠にリトライが発生します。",
    link: {
      href: "https://dashboard.stripe.com/webhooks",
      label: "Stripe Webhook設定を開く",
      external: true,
    },
  },
  {
    id: "stripe-key-rotate",
    category: "Stripe側",
    title: "Stripe APIキーを再発行 (ローテーション)",
    description:
      "本CRMがStripe Secret Keyを保持しているため、解約後の漏洩リスクをゼロにするためにキーを再発行してください。旧キーを即時無効化するのが安全です。",
    link: {
      href: "https://dashboard.stripe.com/apikeys",
      label: "Stripe APIキー設定を開く",
      external: true,
    },
  },
  // ── ステップ2: LINE公式アカウント ───────────────────
  {
    id: "line-webhook-clear",
    category: "LINE側",
    title: "LINE Webhook URL を空にする",
    description:
      "LINE Developers Console → Messaging API設定 → Webhook URL を空欄にして保存し、「Webhookの利用」を OFF にしてください。",
    link: {
      href: "https://developers.line.biz/console/",
      label: "LINE Developers Console を開く",
      external: true,
    },
  },
  {
    id: "line-response-mode",
    category: "LINE側",
    title: "応答モード/応答メッセージを通常運用に戻す",
    description:
      "LINE Official Account Manager → 設定 → 応答設定 で、応答モードを「Bot」または「チャット」の希望する形態に戻してください。",
    link: {
      href: "https://manager.line.biz/",
      label: "LINE Official Account Manager を開く",
      external: true,
    },
  },
  {
    id: "line-token-rotate",
    category: "LINE側",
    title: "チャネルアクセストークンを再発行",
    description:
      "本CRMが保持しているLINEチャネルアクセストークンとチャネルシークレットを、LINE Developers Consoleから再発行してください。旧値が無効化されます。",
    link: {
      href: "https://developers.line.biz/console/",
      label: "LINE Developers Console を開く",
      external: true,
    },
  },
  {
    id: "line-richmenu",
    category: "LINE側",
    title: "リッチメニューの状態を確認",
    description:
      "本CRM経由で作成したリッチメニューがある場合、LINE Official Account Manager から確認し、引き続き使うものはそのまま、不要なものは削除してください。",
    link: {
      href: "https://manager.line.biz/",
      label: "LINE Official Account Manager を開く",
      external: true,
    },
  },
  // ── ステップ3: Google ────────────────────────────────
  {
    id: "google-access-revoke",
    category: "Google側",
    title: "Google カレンダーのアクセス権を取り消す",
    description:
      "本CRMに付与したGoogleカレンダーのOAuthアクセス権を、Googleアカウントのセキュリティ設定から取り消してください。",
    link: {
      href: "https://myaccount.google.com/permissions",
      label: "Googleアカウント サードパーティアクセス を開く",
      external: true,
    },
  },
  // ── ステップ4: 本CRM ─────────────────────────────────
  {
    id: "crm-cancel-request",
    category: "本CRM側",
    title: "運営に解約・データ削除依頼メールを送信",
    description:
      "バックアップを取得した後、本CRM運営に解約とデータ削除を依頼してください。件名「アカウント解約・データ削除依頼」で、組織名・管理者メールアドレス・対象LINEアカウント名を記載。",
  },
  {
    id: "crm-cancel-confirm",
    category: "本CRM側",
    title: "データ削除完了の通知を確認",
    description:
      "運営側でデータが削除されたことの確認連絡を受け取ったら完了です。万が一連絡が無い場合は再度問い合わせてください。",
  },
  // ── ステップ5: 周辺 ──────────────────────────────────
  {
    id: "secrets-clean",
    category: "周辺",
    title: "秘密情報を破棄",
    description:
      "パスワードマネージャー / Notion / Slack / ローカルの.envファイル等に保管していた、CRMのログイン情報・LINE・Stripeのキーを削除してください。",
  },
  {
    id: "bookmarks-clean",
    category: "周辺",
    title: "ブックマーク・ショートカットを削除",
    description:
      "スタッフ端末のブラウザブックマーク・デスクトップショートカットから本CRMへのリンクを削除してください。",
  },
]

const STORAGE_KEY = "line-crm:offboarding-checklist"

export default function OffboardingPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const arr = JSON.parse(saved) as string[]
        setChecked(new Set(arr))
      }
    } catch {
      // ignore
    }
  }, [])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  const resetAll = () => {
    if (!confirm("チェック状態を全てリセットしますか？")) return
    setChecked(new Set())
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const handleDownloadAll = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await fetch("/api/organizations/export")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setDownloadError(err.error || "ダウンロードに失敗しました")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const dateStr = new Date().toISOString().split("T")[0]
      a.download = `line-crm-backup_${dateStr}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError("ダウンロード処理中にエラーが発生しました")
    } finally {
      setDownloading(false)
    }
  }

  const total = CHECKLIST.length
  const done = CHECKLIST.filter((item) => checked.has(item.id)).length
  const percent = Math.round((done / total) * 100)

  // カテゴリごとにグルーピング
  const grouped = CHECKLIST.reduce<Record<string, ChecklistItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {}
  )

  return (
    <AppLayout>
      <PageHeader
        title="解約・データ書き出し"
        description="解約時の作業チェックリストと全データの一括エクスポート"
        action={
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              設定に戻る
            </Button>
          </Link>
        }
      />

      <div className="max-w-4xl space-y-6">
        {/* 注意バナー */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">作業前に必ずデータのバックアップを取得してください</p>
            <p>
              解約後はデータを復元できません。先に下の「全データをダウンロード」ボタンで Excel ファイルを保存してから、チェックリストの作業を進めてください。
            </p>
          </div>
        </div>

        {/* 全データダウンロードカード */}
        <Card id="full-export">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              全データを Excel で一括ダウンロード
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>1つのExcelファイル(.xlsx)に以下の全データをシート別にまとめてダウンロードします:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>友だち一覧 (LINEユーザーID・タグ付き)</li>
                <li>タグマスタ</li>
                <li>セミナー一覧</li>
                <li>セミナー参加履歴</li>
                <li>支払い履歴 (Stripe決済含む)</li>
                <li>配信履歴</li>
                <li>アンケート一覧</li>
                <li>アンケート回答</li>
                <li>メッセージログ (最新1万件)</li>
              </ul>
            </div>
            <Button
              onClick={handleDownloadAll}
              disabled={downloading}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  全データをダウンロード (.xlsx)
                </>
              )}
            </Button>
            {downloadError && (
              <p className="text-sm text-red-600">{downloadError}</p>
            )}
          </CardContent>
        </Card>

        {/* 進捗バー */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span className="text-sm font-semibold">
                  作業進捗: {done} / {total} 完了 ({percent}%)
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetAll}>
                リセット
              </Button>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* チェックリスト */}
        {Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => {
                const isChecked = checked.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isChecked
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={isChecked}
                      onCheckedChange={() => toggle(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={item.id}
                        className={`text-sm font-medium cursor-pointer ${
                          isChecked ? "line-through text-gray-500" : "text-gray-900"
                        }`}
                      >
                        {item.title}
                      </label>
                      <p className="text-xs text-gray-600">{item.description}</p>
                      {item.link && (
                        <div>
                          {item.link.external ? (
                            <a
                              href={item.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              {item.link.label}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : item.link.href.startsWith("#") ? (
                            <a
                              href={item.link.href}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              {item.link.label}
                            </a>
                          ) : (
                            <Link
                              href={item.link.href}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              {item.link.label}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}

        {/* 完了バナー */}
        {done === total && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-1">
              <p className="font-semibold">全ての解約作業が完了しました 🎉</p>
              <p>
                データのバックアップと、外部サービスとの連携解除が全て完了しています。長らくご利用いただきありがとうございました。
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
