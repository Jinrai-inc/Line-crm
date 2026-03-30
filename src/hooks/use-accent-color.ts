import { useAppStore } from "@/stores/app-store"
import { modules } from "@/lib/modules"

export function useAccentColor() {
  const activeModule = useAppStore((s) => s.activeModule)
  return modules[activeModule].color
}
