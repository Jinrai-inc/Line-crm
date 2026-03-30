export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#06C755] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    </div>
  )
}
