"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, FileImage, FileVideo, FileText, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadedFile {
  url: string
  fileName: string
  fileSize: number
  mimeType: string
}

interface FileDropzoneProps {
  onUpload: (file: UploadedFile) => void
  onRemove?: () => void
  accept?: string
  maxSizeMB?: number
  uploadedFile?: UploadedFile | null
  accentColor?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType.startsWith("video/")) return FileVideo
  return FileText
}

export function FileDropzone({
  onUpload,
  onRemove,
  accept = "image/jpeg,image/png,image/gif,image/webp,video/mp4,application/pdf",
  maxSizeMB = 10,
  uploadedFile,
  accentColor = "#06C755",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`ファイルサイズは${maxSizeMB}MB以下にしてください`)
        return
      }

      // Validate type
      const acceptTypes = accept.split(",").map((t) => t.trim())
      if (!acceptTypes.some((t) => file.type === t || file.type.startsWith(t.replace("/*", "/")))) {
        setError("このファイル形式は対応していません")
        return
      }

      setUploading(true)
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 90))
        }, 200)

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)
        setProgress(100)

        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || "アップロードに失敗しました")
        }

        const data = await res.json()
        onUpload({
          url: data.url,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "アップロードに失敗しました")
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [accept, maxSizeMB, onUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      // Reset input
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFile]
  )

  // Uploaded file display
  if (uploadedFile) {
    const Icon = getFileIcon(uploadedFile.mimeType)
    const isImage = uploadedFile.mimeType.startsWith("image/")

    return (
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
        {isImage && (
          <div className="relative bg-gray-50 flex items-center justify-center max-h-48 overflow-hidden">
            <img
              src={uploadedFile.url}
              alt={uploadedFile.fileName}
              className="max-h-48 object-contain"
            />
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Icon size={20} style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadedFile.fileName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.fileSize)}</p>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-gray-400 hover:text-red-500"
              onClick={onRemove}
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Uploading state
  if (uploading) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">アップロード中...</p>
        <div className="w-48 mx-auto h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    )
  }

  // Dropzone
  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-current bg-opacity-5"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
        }`}
        style={isDragging ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        <div
          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <Upload size={24} style={{ color: accentColor }} />
        </div>
        <p className="text-sm font-medium text-gray-700">
          ドラッグ＆ドロップまたは<span style={{ color: accentColor }}>ファイルを選択</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPEG, PNG, GIF, WebP, MP4, PDF（最大{maxSizeMB}MB）
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  )
}
