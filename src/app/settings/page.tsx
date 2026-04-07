"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { PageHeader } from "@/components/layout/page-header"
import {
  MessageSquare,
  Calendar,
  CreditCard,
  Building2,
  Users,
  ChevronRight,
  Timer,
  Copy,
  Check,
  Webhook,
  ExternalLink,
  HandHeart,
} from "lucide-react"

interface SettingsMenuItem {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  iconBgColor: string
  iconColor: string
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    title: "LINE連携設定",
    description: "LINE公式アカウントとの連携を設定します",
    href: "/settings/line",
    icon: <MessageSquare className="h-6 w-6" />,
    iconBgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    title: "Googleカレンダー連携",
    description: "Googleカレンダーとの同期を設定します",
    href: "/settings/google-calendar",
    icon: <Calendar className="h-6 w-6" />,
    iconBgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Stripe決済連携",
    description: "Stripe決済との連携を設定します",
    href: "/settings/stripe",
    icon: <CreditCard className="h-6 w-6" />,
    iconBgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    title: "組織設定",
    description: "組織の基本情報を管理します",
    href: "/settings/organization",
    icon: <Building2 className="h-6 w-6" />,
    iconBgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  {
    title: "メンバー管理",
    description: "メンバーの追加・権限管理を行います",
    href: "/settings/organization",
    icon: <Users className="h-6 w-6" />,
    iconBgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    title: "挨拶メッセージ",
    description: "友だち追加時の自動メッセージを設定・期間指定ができます",
    href: "/settings/greeting",
    icon: <HandHeart className="h-6 w-6" />,
    iconBgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    title: "自動タグ付与",
    description: "友だち追加から一定時間以内の登録者に自動でタグを付与します",
    href: "/settings/auto-tag",
    icon: <Timer className="h-6 w-6" />,
    iconBgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
]

export default function SettingsPage() {
  const [lineWebhookUrl, setLineWebhookUrl] = useState("")
  const [stripeWebhookUrl, setStripeWebhookUrl] = useState("")
  const [copiedLine, setCopiedLine] = useState(false)
  const [copiedStripe, setCopiedStripe] = useState(false)

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    setLineWebhookUrl(`${origin}/api/webhook/line`)
    setStripeWebhookUrl(`${origin}/api/stripe/webhook`)
  }, [])

  const handleCopy = async (url: string, type: "line" | "stripe") => {
    try {
      await navigator.clipboard.writeText(url)
      if (type === "line") {
        setCopiedLine(true)
        setTimeout(() => setCopiedLine(false), 2000)
      } else {
        setCopiedStripe(true)
        setTimeout(() => setCopiedStripe(false), 2000)
      }
    } catch { /* ignore */ }
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader title="設定" description="各種連携やアカウントの設定を管理します" />

      <div className="max-w-2xl space-y-6">
        {/* Webhook URL セクション */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Webhook className="h-5 w-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">Webhook URL</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* LINE Webhook */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">LINE</span>
                <span className="text-xs text-gray-500">LINE Developersコンソールに設定</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-800">
                  {lineWebhookUrl}
                </code>
                <button
                  onClick={() => handleCopy(lineWebhookUrl, "line")}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copiedLine ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copiedLine ? "コピー済" : "コピー"}
                </button>
              </div>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline"
              >
                LINE Developersコンソールを開く
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Stripe Webhook */}
            <div className="space-y-1.5 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Stripe</span>
                <span className="text-xs text-gray-500">Stripeダッシュボードに設定</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-800">
                  {stripeWebhookUrl}
                </code>
                <button
                  onClick={() => handleCopy(stripeWebhookUrl, "stripe")}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copiedStripe ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copiedStripe ? "コピー済" : "コピー"}
                </button>
              </div>
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 underline"
              >
                Stripeダッシュボードを開く
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* 設定メニュー */}
        <div className="space-y-3">
          {settingsMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div
                className={`shrink-0 flex items-center justify-center h-12 w-12 rounded-lg ${item.iconBgColor} ${item.iconColor}`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
