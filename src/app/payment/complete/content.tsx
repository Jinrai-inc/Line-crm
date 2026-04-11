"use client"

import { useSearchParams } from "next/navigation"

export default function PaymentCompleteContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status")
  const isCancelled = status === "cancel"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {isCancelled ? (
          <>
            <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              お支払いがキャンセルされました
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              お支払いは完了していません。
              <br />
              LINEのトーク画面からもう一度お手続きいただけます。
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">&#x2705;</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              お支払いが完了しました
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              ありがとうございます。
              <br />
              詳細はLINEのトーク画面をご確認ください。
            </p>
          </>
        )}
        <p className="text-xs text-gray-400">
          このページは閉じていただいて問題ありません。
        </p>
      </div>
    </div>
  )
}
