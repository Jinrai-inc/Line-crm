"use client"

interface MockBrowserProps {
  url?: string
  title?: string
  children: React.ReactNode
}

export function MockBrowser({
  url = "https://developers.line.biz",
  title,
  children,
}: MockBrowserProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-lg">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
        {/* Traffic light dots */}
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        {/* URL bar */}
        <div className="flex-1">
          <div className="mx-auto max-w-md rounded-md bg-white px-3 py-1 text-center text-xs text-gray-500">
            {url}
          </div>
        </div>
      </div>

      {/* Tab bar with title */}
      {title && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-1.5">
          <span className="text-xs font-medium text-gray-700">{title}</span>
        </div>
      )}

      {/* Content area */}
      <div className="bg-white p-4">{children}</div>
    </div>
  )
}
