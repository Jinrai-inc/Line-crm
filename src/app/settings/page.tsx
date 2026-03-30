"use client"

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
]

export default function SettingsPage() {
  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader title="設定" description="各種連携やアカウントの設定を管理します" />

      <div className="max-w-2xl">
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
