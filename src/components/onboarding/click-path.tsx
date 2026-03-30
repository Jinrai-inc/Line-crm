"use client"

import { ChevronRight } from "lucide-react"

interface ClickPathProps {
  steps: string[]
}

export function ClickPath({ steps }: ClickPathProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        return (
          <span key={index} className="flex items-center gap-1">
            <span
              className={
                isLast
                  ? "font-bold text-green-600"
                  : "text-gray-600"
              }
            >
              {step}
            </span>
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </span>
        )
      })}
    </div>
  )
}
