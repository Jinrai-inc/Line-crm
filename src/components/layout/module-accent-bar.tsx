"use client"

import { modules } from "@/lib/modules"
import { useAppStore } from "@/stores/app-store"

export function ModuleAccentBar() {
  const activeModule = useAppStore((state) => state.activeModule)
  const currentModule = modules[activeModule]

  return (
    <div
      className="h-[3px] w-full"
      style={{
        background: `linear-gradient(to right, ${currentModule.color}, ${currentModule.colorDark})`,
      }}
    />
  )
}
