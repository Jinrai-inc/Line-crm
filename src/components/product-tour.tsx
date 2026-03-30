"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface TourStep {
  title: string
  description: string
  targetSelector: string
}

const tourSteps: TourStep[] = [
  {
    title: "ダッシュボード",
    description:
      "ここではシステム全体の概要を確認できます。友だち数やセミナー情報など、重要な指標が一目でわかります。",
    targetSelector: '[data-tour="dashboard"]',
  },
  {
    title: "友だち一覧",
    description:
      "LINE友だちの管理ページです。タグ付け、検索、フィルタリングなどで効率的に顧客を管理できます。",
    targetSelector: '[data-tour="friends"]',
  },
  {
    title: "セミナー管理",
    description:
      "セミナーの作成・管理ができます。参加者の管理や出欠確認もこちらから行えます。",
    targetSelector: '[data-tour="seminars"]',
  },
  {
    title: "配信",
    description:
      "LINEメッセージの一斉配信ができます。タグを使ってターゲットを絞った配信も可能です。",
    targetSelector: '[data-tour="broadcasts"]',
  },
  {
    title: "設定",
    description:
      "LINE連携やシステムの各種設定を行えます。まずはLINE公式アカウントとの連携を完了させましょう。",
    targetSelector: '[data-tour="settings"]',
  },
]

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

export function ProductTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if tour should show
  useEffect(() => {
    async function checkTourStatus() {
      try {
        const res = await fetch("/api/organizations/me")
        if (res.ok) {
          const data = await res.json()
          if (!data.product_tour_completed) {
            setIsActive(true)
          }
        }
      } catch {
        // Silently fail - don't block user
      }
    }
    checkTourStatus()
  }, [])

  // Update highlight position when step changes
  const updateHighlight = useCallback(() => {
    if (!isActive) return

    const step = tourSteps[currentStep]
    const target = document.querySelector(step.targetSelector)
    if (target) {
      const rect = target.getBoundingClientRect()
      setHighlightRect({
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      })
    } else {
      setHighlightRect(null)
    }
  }, [isActive, currentStep])

  useEffect(() => {
    updateHighlight()
    window.addEventListener("resize", updateHighlight)
    window.addEventListener("scroll", updateHighlight)
    return () => {
      window.removeEventListener("resize", updateHighlight)
      window.removeEventListener("scroll", updateHighlight)
    }
  }, [updateHighlight])

  const completeTour = useCallback(async () => {
    setIsActive(false)
    try {
      await fetch("/api/organizations/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_tour_completed: true }),
      })
    } catch {
      // Silently fail
    }
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeTour()
    }
  }, [currentStep, completeTour])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  if (!mounted || !isActive) return null

  const step = tourSteps[currentStep]

  // Calculate tooltip position
  const tooltipStyle: React.CSSProperties = highlightRect
    ? {
        position: "fixed",
        top: highlightRect.top + highlightRect.height + 12,
        left: Math.max(16, Math.min(highlightRect.left, window.innerWidth - 360)),
        zIndex: 10002,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10002,
      }

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Dimmed overlay with cutout */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 10000 }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
      {highlightRect && (
        <div
          className="fixed rounded-lg border-2 border-[#06C755] pointer-events-none"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            zIndex: 10001,
            boxShadow: "0 0 0 4px rgba(6, 199, 85, 0.2)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-[340px]"
        style={tooltipStyle}
      >
        {/* Close button */}
        <button
          onClick={completeTour}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="ツアーをスキップ"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-[#06C755]"
                  : i < currentStep
                    ? "w-1.5 bg-[#06C755]/40"
                    : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1">
          {step.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          {step.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={completeTour}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            スキップ
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="w-3 h-3" />
                戻る
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep < tourSteps.length - 1 ? (
                <>
                  次へ
                  <ChevronRight className="w-3 h-3" />
                </>
              ) : (
                "完了"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
