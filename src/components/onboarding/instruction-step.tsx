"use client"

interface InstructionStepProps {
  step: number
  title: string
  description?: string
  children?: React.ReactNode
}

export function InstructionStep({
  step,
  title,
  description,
  children,
}: InstructionStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
        {step}
      </div>
      <div className="flex-1 pt-0.5">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  )
}
