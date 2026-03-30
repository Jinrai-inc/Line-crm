"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors outline-none",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-900",
        "placeholder:text-gray-400",
        "focus-visible:border-[#06C755] focus-visible:ring-2 focus-visible:ring-[#06C755]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
