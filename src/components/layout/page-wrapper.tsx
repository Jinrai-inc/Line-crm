"use client"

import type { ReactNode } from "react"
import { ModuleAccentBar } from "./module-accent-bar"

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-full">
      <ModuleAccentBar />
      <div className="p-4 lg:p-6">{children}</div>
    </div>
  )
}
