"use client"

import { formatRelativeTime } from "@/lib/utils/date"
import {
  UserPlus,
  ClipboardList,
  MessageSquare,
  Megaphone,
  PartyPopper,
  HeartHandshake,
  FileText,
  type LucideIcon,
} from "lucide-react"

type ActivityType =
  | "friend_added"
  | "seminar_applied"
  | "message_sent"
  | "broadcast_sent"
  | "member_joined"
  | "omiai_completed"

type Activity = {
  id: string
  type: string
  message: string
  timestamp: string
}

type ActivityFeedProps = {
  activities: Activity[]
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: LucideIcon; color: string; bg: string; label: string }
> = {
  friend_added: {
    icon: UserPlus,
    color: "text-green-600",
    bg: "bg-green-50",
    label: "友だち追加",
  },
  seminar_applied: {
    icon: ClipboardList,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "セミナー申込",
  },
  message_sent: {
    icon: MessageSquare,
    color: "text-purple-600",
    bg: "bg-purple-50",
    label: "メッセージ送信",
  },
  broadcast_sent: {
    icon: Megaphone,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "一斉配信",
  },
  member_joined: {
    icon: PartyPopper,
    color: "text-pink-600",
    bg: "bg-pink-50",
    label: "入会",
  },
  omiai_completed: {
    icon: HeartHandshake,
    color: "text-rose-600",
    bg: "bg-rose-50",
    label: "お見合い完了",
  },
}

const DEFAULT_CONFIG = {
  icon: FileText,
  color: "text-gray-600",
  bg: "bg-gray-50",
  label: "その他",
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500">
        最近のアクティビティはありません
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-y-auto space-y-1">
      {activities.map((activity) => {
        const config =
          ACTIVITY_CONFIG[activity.type as ActivityType] ?? DEFAULT_CONFIG
        const Icon = config.icon

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <span
              className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full ${config.bg}`}
            >
              <Icon size={16} className={config.color} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900 leading-snug">
                {activity.message}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${config.color}`}
                >
                  {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
