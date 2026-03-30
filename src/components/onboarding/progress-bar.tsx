"use client"

interface ProgressBarProps {
  steps: { label: string }[]
  currentStep: number
}

export function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="flex w-full items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={index} className="flex flex-1 items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center rounded-full font-semibold transition-all ${
                  isCompleted
                    ? "h-8 w-8 bg-green-500 text-sm text-white"
                    : isCurrent
                      ? "h-10 w-10 bg-green-500 text-base text-white ring-4 ring-green-100"
                      : "h-8 w-8 bg-gray-200 text-sm text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`mt-2 text-center text-xs ${
                  isCompleted || isCurrent
                    ? "font-medium text-green-700"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="mx-2 mb-6 h-0.5 flex-1">
                <div
                  className={`h-full ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
