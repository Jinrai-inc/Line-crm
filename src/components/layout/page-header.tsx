"use client"

import type { ReactNode } from "react"
import { modules } from "@/lib/modules"
import { useAppStore } from "@/stores/app-store"
import {
  CalendarDays,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react"

const moduleIconMap: Record<string, LucideIcon> = {
  CalendarDays,
  HeartHandshake,
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const activeModule = useAppStore((state) => state.activeModule)
  const currentModule = modules[activeModule]
  const Icon = moduleIconMap[currentModule.icon]

  return (
    <div className="mb-6">
      <div>
        {/* Module badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white mb-2"
          style={{ backgroundColor: currentModule.color }}
        >
          {Icon && <Icon size={12} />}
          <span>{currentModule.label}</span>
        </span>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  )
}
