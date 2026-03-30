"use client"

import type { ReactNode } from "react"
import { modules } from "@/lib/modules"
import { useAppStore } from "@/stores/app-store"
interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const activeModule = useAppStore((state) => state.activeModule)
  const currentModule = modules[activeModule]

  return (
    <div className="mb-6">
      <div>
        {/* Module badge */}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white mb-2"
          style={{ backgroundColor: currentModule.color }}
        >
          <span>{currentModule.icon}</span>
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
