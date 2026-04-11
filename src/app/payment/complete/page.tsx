import { Suspense } from "react"
import PaymentCompleteContent from "./content"

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">読み込み中...</div>
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  )
}
