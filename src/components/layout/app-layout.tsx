"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAppStore } from "@/stores/app-store"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)

  return (
    <div className="min-h-screen flex bg-background">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
