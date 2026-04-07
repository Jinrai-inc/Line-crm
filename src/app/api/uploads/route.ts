import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

const BUCKET_NAME = "broadcast-media"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "application/pdf",
]

// ファイルアップロード
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "対応形式: JPEG, PNG, GIF, WebP, MP4, PDF" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)
    if (!bucketExists) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      })
    }

    // Generate unique path
    const ext = file.name.split(".").pop() || "bin"
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filePath = `${orgId}/${timestamp}-${random}.${ext}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath,
    })
  } catch (error) {
    console.error("Upload POST error:", error)
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 })
  }
}
