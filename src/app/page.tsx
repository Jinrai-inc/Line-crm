"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { useAppStore } from "@/stores/app-store"
import { modules } from "@/lib/modules"
import {
  Users,
  Calendar,
  CalendarDays,
  UserPlus,
  ClipboardList,
  Heart,
  HeartHandshake,
  TrendingUp,
  Award,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { CalendarSchedule } from "@/components/dashboard/calendar-schedule"

const moduleIconMap: Record<string, LucideIcon> = {
  CalendarDays,
  HeartHandshake,
}

interface DashboardStats {
  seminar: {
    activeFriends: number
    openSeminars: number
    newFriendsThisMonth: number
    totalAttendances: number
  }
  marriage: {
    activeMembers: number
    omiaiMatchRate: number
    marriageCount: number
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{label}</p>
          {loading ? (
            <div className="h-9 mt-1 flex items-center">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
          )}
        </div>
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={20} className="sm:hidden" style={{ color }} />
          <Icon size={24} className="hidden sm:block" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function ModuleCard({
  moduleId,
  isActive,
  stats,
  loading,
}: {
  moduleId: "seminar" | "marriage"
  isActive: boolean
  stats: { label: string; value: string | number }[]
  loading?: boolean
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
      <div
        className="absolute top-0 left-4 right-4 h-[3px] rounded-b"
        style={{ backgroundColor: mod.color }}
      />

      <div className="flex items-center gap-3 mb-4">
        {(() => { const MIcon = moduleIconMap[mod.icon]; return MIcon ? <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}><MIcon size={20} style={{ color: mod.color }} /></div> : null })()}
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
            {loading ? (
              <Loader2 className="animate-spin text-muted-foreground mx-auto" size={16} />
            ) : (
              <p className="text-xl font-bold">{stat.value}</p>
            )}
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const activeModule = useAppStore((state) => state.activeModule)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const seminarStats = stats?.seminar
  const marriageStats = stats?.marriage

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader
        title="ダッシュボード"
        description="LINE connect CRM管理システムの概要"
      />

      {/* モジュールカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ModuleCard
          moduleId="seminar"
          isActive={activeModule === "seminar"}
          loading={loading}
          stats={[
            { label: "アクティブ友だち", value: seminarStats?.activeFriends ?? 0 },
            { label: "募集中セミナー", value: seminarStats?.openSeminars ?? 0 },
          ]}
        />
        <ModuleCard
          moduleId="marriage"
          isActive={activeModule === "marriage"}
          loading={loading}
          stats={[
            { label: "活動中会員", value: marriageStats?.activeMembers ?? 0 },
            { label: "成婚卒業", value: marriageStats?.marriageCount ?? 0 },
          ]}
        />
      </div>

      {/* セミナー事業ダッシュボード */}
      {activeModule === "seminar" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="アクティブ友だち数"
              value={seminarStats?.activeFriends ?? 0}
              icon={Users}
              color="#06C755"
              loading={loading}
            />
            <StatCard
              label="募集中セミナー数"
              value={seminarStats?.openSeminars ?? 0}
              icon={Calendar}
              color="#3B82F6"
              loading={loading}
            />
            <StatCard
              label="今月の新規友だち"
              value={seminarStats?.newFriendsThisMonth ?? 0}
              icon={UserPlus}
              color="#8B5CF6"
              loading={loading}
            />
            <StatCard
              label="累計セミナー申込数"
              value={seminarStats?.totalAttendances ?? 0}
              icon={ClipboardList}
              color="#F59E0B"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CalendarSchedule accentColor="#06C755" />
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
              value={marriageStats?.activeMembers ?? 0}
              icon={Heart}
              color="#EC4899"
              loading={loading}
            />
            <StatCard
              label="お見合い成立率"
              value={`${marriageStats?.omiaiMatchRate ?? 0}%`}
              icon={HeartHandshake}
              color="#F59E0B"
              loading={loading}
            />
            <StatCard
              label="成婚数"
              value={marriageStats?.marriageCount ?? 0}
              icon={Award}
              color="#06C755"
              loading={loading}
            />
            <StatCard
              label="平均成婚期間"
              value="-"
              icon={TrendingUp}
              color="#3B82F6"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CalendarSchedule accentColor="#EC4899" />
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
