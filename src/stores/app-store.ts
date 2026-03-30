import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  activeModule: "seminar" | "marriage"
  sidebarOpen: boolean
  setActiveModule: (mod: "seminar" | "marriage") => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: "seminar",
      sidebarOpen: true,
      setActiveModule: (mod) => set({ activeModule: mod }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'line-crm-store',
      partialize: (state) => ({ activeModule: state.activeModule }),
    }
  )
)
