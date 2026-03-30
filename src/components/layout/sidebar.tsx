"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  Calendar,
  CheckSquare,
  Send,
  Heart,
  HeartHandshake,
  ClipboardList,
  TrendingUp,
  Tag,
  Settings,
  HelpCircle,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  CalendarClock,
  type LucideIcon,
} from "lucide-react"
import { modules, commonNavItems, type NavItem } from "@/lib/modules"
import { useAppStore } from "@/stores/app-store"

const iconMap: Record<string, LucideIcon> = {
  Users,
  Calendar,
  CheckSquare,
  Send,
  Heart,
  HeartHandshake,
  ClipboardList,
  TrendingUp,
  Tag,
  Settings,
  HelpCircle,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  CalendarClock,
}

function NavLink({
  item,
  activeColor,
  pathname,
  onClick,
}: {
  item: NavItem
  activeColor: string
  pathname: string
  onClick?: () => void
}) {
  const Icon = iconMap[item.icon]
  const isActive = pathname === item.href

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
      style={isActive ? { backgroundColor: activeColor } : undefined}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const {
    activeModule,
    setActiveModule,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  } = useAppStore()
  const currentModule = modules[activeModule]
  const otherModuleId = activeModule === "seminar" ? "marriage" : "seminar"
  const otherModule = modules[otherModuleId]

  // Swipe-to-close gesture support
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const deltaX = touchCurrentX.current - touchStartX.current
      // Swipe left to close (threshold of 80px)
      if (deltaX < -80) {
        setSidebarOpen(false)
      }
    }
    touchStartX.current = null
    touchCurrentX.current = null
  }, [setSidebarOpen])

  // Close sidebar on route change for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) return
      setSidebarOpen(false)
    }
    // No-op: route changes already close via NavLink onClick
    // Listen for orientation changes on mobile
    window.addEventListener("orientationchange", handleResize)
    return () => window.removeEventListener("orientationchange", handleResize)
  }, [setSidebarOpen])

  return (
    <>
      {/* Mobile overlay with backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 flex flex-col sidebar-transition ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-xl font-bold"
              style={{ color: "#06C755" }}
            >
              LINE
            </span>
            <span className="text-xl font-bold text-white">CRM</span>
          </Link>
        </div>

        {/* Module switcher */}
        <ModuleSwitcher
          currentModule={currentModule}
          otherModule={otherModule}
          otherModuleId={otherModuleId}
          setActiveModule={setActiveModule}
        />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {/* Dashboard */}
          <NavLink
            item={{ label: "ダッシュボード", href: "/dashboard", icon: "LayoutDashboard" }}
            activeColor={currentModule.color}
            pathname={pathname}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Module nav items */}
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {currentModule.label}
            </p>
          </div>
          {currentModule.navItems.map((item) => (
            <NavLink
              key={item.href + item.label}
              item={item}
              activeColor={currentModule.color}
              pathname={pathname}
              onClick={() => setSidebarOpen(false)}
            />
          ))}

          {/* Common nav items */}
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              共通機能
            </p>
          </div>
          {commonNavItems.map((item) => (
            <NavLink
              key={item.href + item.label}
              item={item}
              activeColor={currentModule.color}
              pathname={pathname}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Quick switch button at bottom */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={() => setActiveModule(otherModuleId as "seminar" | "marriage")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span className="text-lg">{otherModule.icon}</span>
            <span>{otherModule.label}に切替</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function ModuleSwitcher({
  currentModule,
  otherModule,
  otherModuleId,
  setActiveModule,
}: {
  currentModule: (typeof modules)[string]
  otherModule: (typeof modules)[string]
  otherModuleId: string
  setActiveModule: (mod: "seminar" | "marriage") => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="px-3 py-3" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        style={{ backgroundColor: isOpen ? "#1F2937" : undefined }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentModule.icon}</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">
              {currentModule.label}
            </p>
            <p className="text-xs text-gray-500">{currentModule.description}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-1 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <button
            onClick={() => {
              setActiveModule(otherModuleId as "seminar" | "marriage")
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700 transition-colors"
          >
            <span className="text-lg">{otherModule.icon}</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">
                {otherModule.label}
              </p>
              <p className="text-xs text-gray-500">
                {otherModule.description}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
