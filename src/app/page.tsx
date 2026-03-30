"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { useAppStore } from "@/stores/app-store"
import { modules } from "@/lib/modules"
import {
  Users,
  Calendar,
  UserPlus,
  ClipboardList,
  Heart,
  HeartHandshake,
  TrendingUp,
  Award,
} from "lucide-react"

// 統計カードコンポーネント
function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  change?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${change.startsWith("+") ? "text-green-600" : "text-red-500"}`}>
              {change}
            </p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

// モジュールカード
function ModuleCard({
  moduleId,
  isActive,
  stats,
}: {
  moduleId: "seminar" | "marriage"
  isActive: boolean
  stats: { label: string; value: string | number }[]
}) {
  const setActiveModule = useAppStore((state) => state.setActiveModule)
  const mod = modules[moduleId]

  return (
    <div
      onClick={() => setActiveModule(moduleId)}
      className={`relative bg-card rounded-2xl border-2 p-6 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 ${
        isActive ? "border-opacity-100" : "border-gray-200 hover:border-opacity-50"
      }`}
      style={{
        borderColor: isActive ? mod.color : undefined,
      }}
    >
      {/* アクセントバー */}
      <div
        className="absolute top-0 left-4 right-4 h-[3px] rounded-b"
        style={{ backgroundColor: mod.color }}
      />

      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{mod.icon}</span>
        <div>
          <h3 className="font-bold">{mod.label}</h3>
          <p className="text-xs text-muted-foreground">{mod.description}</p>
        </div>
        {isActive ? (
          <span
            className="ml-auto text-xs font-semibold px-2 py-1 rounded text-white"
            style={{ backgroundColor: mod.color }}
          >
            表示中
          </span>
        ) : (
          <span className="ml-auto text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-500">
            切替 &rarr;
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-2 bg-background rounded-lg">
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const activeModule = useAppStore((state) => state.activeModule)

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader
        title="ダッシュボード"
        description="LINE CRM管理システムの概要"
      />

      {/* モジュールカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ModuleCard
          moduleId="seminar"
          isActive={activeModule === "seminar"}
          stats={[
            { label: "アクティブ友だち", value: 0 },
            { label: "募集中セミナー", value: 0 },
          ]}
        />
        <ModuleCard
          moduleId="marriage"
          isActive={activeModule === "marriage"}
          stats={[
            { label: "活動中会員", value: 0 },
            { label: "成婚卒業", value: 0 },
          ]}
        />
      </div>

      {/* セミナー事業ダッシュボード */}
      {activeModule === "seminar" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="アクティブ友だち数"
              value={0}
              change="+0 先月比"
              icon={Users}
              color="#06C755"
            />
            <StatCard
              label="募集中セミナー数"
              value={0}
              icon={Calendar}
              color="#3B82F6"
            />
            <StatCard
              label="今月の新規友だち"
              value={0}
              icon={UserPlus}
              color="#8B5CF6"
            />
            <StatCard
              label="累計セミナー申込数"
              value={0}
              icon={ClipboardList}
              color="#F59E0B"
            />
          </div>

          {/* プレースホルダーカード */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold mb-4">友だち推移</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                データがありません
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold mb-4">最近のアクティビティ</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                アクティビティはまだありません
              </div>
            </div>
          </div>
        </>
      )}

      {/* 婚活スクールダッシュボード */}
      {activeModule === "marriage" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="活動中会員数"
              value={0}
              icon={Heart}
              color="#EC4899"
            />
            <StatCard
              label="お見合い成立率"
              value="0%"
              icon={HeartHandshake}
              color="#F59E0B"
            />
            <StatCard
              label="成婚率"
              value="0%"
              icon={Award}
              color="#06C755"
            />
            <StatCard
              label="平均成婚期間"
              value="-"
              icon={TrendingUp}
              color="#3B82F6"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold mb-4">会員パイプライン</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                データがありません
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold mb-4">今後のお見合い予定</h3>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                予定はありません
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}
