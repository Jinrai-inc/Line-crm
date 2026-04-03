"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { ProgressBar } from "./progress-bar"

interface WizardLayoutProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showBack?: boolean
  children: React.ReactNode
}

export function WizardLayout({
  currentStep,
  totalSteps,
  stepLabels,
  onBack,
  onNext,
  nextLabel = "次へ",
  nextDisabled = false,
  showBack = true,
  children,
}: WizardLayoutProps) {
  const steps = stepLabels.map((label) => ({ label }))

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-8">
      {/* Header: Logo + Progress */}
      <div className="w-full max-w-[800px]">
        <div className="mb-2 text-center text-xl font-bold text-green-600">
          LINE connect CRM
        </div>
        <ProgressBar steps={steps} currentStep={currentStep} />
      </div>

      {/* Content */}
      <div className="mt-8 w-full max-w-[800px] flex-1">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>

      {/* Footer: Navigation buttons */}
      <div className="mt-8 flex w-full max-w-[800px] items-center justify-between">
        <div>
          {showBack && currentStep > 0 && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>
          )}
        </div>
        <div>
          {currentStep < totalSteps - 1 && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
