"use client"

import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

type CalloutVariant = "info" | "warning" | "success" | "danger"

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: React.ReactNode
}

const variantStyles: Record<
  CalloutVariant,
  { bg: string; border: string; icon: React.ReactNode; titleColor: string }
> = {
  info: {
    bg: "bg-blue-50",
    border: "border-l-blue-500",
    icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    titleColor: "text-blue-800",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-l-yellow-500",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />,
    titleColor: "text-yellow-800",
  },
  success: {
    bg: "bg-green-50",
    border: "border-l-green-500",
    icon: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
    titleColor: "text-green-800",
  },
  danger: {
    bg: "bg-red-50",
    border: "border-l-red-500",
    icon: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    titleColor: "text-red-800",
  },
}

export function Callout({ variant = "info", title, children }: CalloutProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={`${styles.bg} ${styles.border} rounded-[12px] border-l-4 p-4`}
    >
      <div className="flex gap-3">
        {styles.icon}
        <div className="flex-1">
          {title && (
            <p className={`${styles.titleColor} mb-1 font-semibold`}>
              {title}
            </p>
          )}
          <div className="text-sm text-gray-700">{children}</div>
        </div>
      </div>
    </div>
  )
}
