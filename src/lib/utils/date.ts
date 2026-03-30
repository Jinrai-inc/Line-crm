import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { ja } from "date-fns/locale"

// 日付フォーマット: YYYY年MM月DD日（曜日）
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "yyyy年MM月dd日（E）", { locale: ja })
}

// 短い日付フォーマット: YYYY/MM/DD
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "yyyy/MM/dd")
}

// 時間フォーマット: HH:mm
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

// 相対時間: 「3日前」「1時間前」「たった今」
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  if (isToday(d)) {
    const diffMs = Date.now() - d.getTime()
    if (diffMs < 60 * 1000) return "たった今"
    return formatDistanceToNow(d, { locale: ja, addSuffix: true })
  }

  if (isYesterday(d)) return "昨日"

  return formatDistanceToNow(d, { locale: ja, addSuffix: true })
}

// 日時フォーマット: YYYY年MM月DD日 HH:mm
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "yyyy年MM月dd日 HH:mm", { locale: ja })
}
