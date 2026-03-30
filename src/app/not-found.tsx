import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <FileQuestion className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ページが見つかりません
        </h2>

        <p className="text-gray-500 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#06C755] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#05b54c] transition-colors"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  )
}
