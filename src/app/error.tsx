"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("アプリケーションエラー:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          エラーが発生しました
        </h1>

        <p className="text-gray-500 mb-2">
          予期しないエラーが発生しました。問題が続く場合は管理者にお問い合わせください。
        </p>

        {error.message && (
          <p className="text-sm text-gray-400 mb-6 font-mono bg-gray-100 rounded-lg p-3 break-all">
            {error.message}
          </p>
        )}

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            エラーID: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()} variant="default">
            <RotateCcw className="w-4 h-4" />
            再試行
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
