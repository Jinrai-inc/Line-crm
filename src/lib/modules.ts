export interface BusinessModule {
  id: "seminar" | "marriage"
  label: string
  icon: string
  color: string
  colorLight: string
  colorDark: string
  description: string
  navItems: NavItem[]
}

export interface NavItem {
  label: string
  href: string
  icon: string
}

export const modules: Record<string, BusinessModule> = {
  seminar: {
    id: "seminar",
    label: "セミナー事業",
    icon: "📅",
    color: "#06C755",
    colorLight: "#D1FAE5",
    colorDark: "#04A847",
    description: "友だち管理・セミナー・配信",
    navItems: [
      { label: "友だち管理", href: "/friends", icon: "Users" },
      { label: "セミナー管理", href: "/seminars", icon: "Calendar" },
      { label: "参加履歴", href: "/attendance", icon: "CheckSquare" },
      { label: "配信", href: "/broadcasts", icon: "Send" },
    ],
  },
  marriage: {
    id: "marriage",
    label: "婚活スクール",
    icon: "💍",
    color: "#EC4899",
    colorLight: "#FCE7F3",
    colorDark: "#DB2777",
    description: "会員・お見合い・コーチング",
    navItems: [
      { label: "会員管理", href: "/members", icon: "Heart" },
      { label: "お見合い管理", href: "/omiai", icon: "HeartHandshake" },
      { label: "コーチング記録", href: "/consultations", icon: "ClipboardList" },
      { label: "成婚分析", href: "/analytics/marriage", icon: "TrendingUp" },
      { label: "LINE配信", href: "/broadcasts", icon: "Send" },
    ],
  },
}

export const commonNavItems: NavItem[] = [
  { label: "タグ管理", href: "/tags", icon: "Tag" },
  { label: "予約管理", href: "/bookings", icon: "CalendarClock" },
  { label: "売上・決済", href: "/payments", icon: "CreditCard" },
  { label: "設定", href: "/settings", icon: "Settings" },
  { label: "ヘルプ", href: "/help", icon: "HelpCircle" },
]
