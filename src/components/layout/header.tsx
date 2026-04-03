"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Menu,
  LogOut,
  User,
  ChevronDown,
  CalendarDays,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react"
import { modules } from "@/lib/modules"
import { useAppStore } from "@/stores/app-store"
import { createClient } from "@/lib/supabase/client"

const moduleIconMap: Record<string, LucideIcon> = {
  CalendarDays,
  HeartHandshake,
}

export function Header() {
  const router = useRouter()
  const { activeModule, toggleSidebar } = useAppStore()
  const currentModule = modules[activeModule]
  const ModIcon = moduleIconMap[currentModule.icon]

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false)
    await createClient().auth.signOut()
    router.push("/login")
  }, [router])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 sm:px-4 lg:px-6 bg-white border-b border-gray-200">
      {/* Left side: mobile menu + module badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Module badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: currentModule.color }}
        >
          {ModIcon && <ModIcon size={14} />}
          <span className="hidden xs:inline">{currentModule.label}</span>
        </span>
      </div>

      {/* Right side: user menu */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <span className="hidden sm:inline text-sm font-medium text-gray-700">
            管理者
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white border border-gray-200 shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">管理者</p>
              <p className="text-xs text-gray-500 truncate">{userEmail ?? ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
