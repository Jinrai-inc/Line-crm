import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { uploadRichMenuImage } from "@/lib/line/richmenu"

async function getLineAccessToken(orgId: string): Promise<{
  accessToken: string
} | null> {
  const admin = createAdminClient()
  const { data: lineAccount } = await admin
    .from("line_accounts")
    .select("channel_access_token")
    .eq("organization_id", orgId)
    .single()

  if (!lineAccount) return null
  return { accessToken: lineAccount.channel_access_token }
}

// リッチメニュー画像アップロード
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response
    const { orgId } = auth

    const line = await getLineAccessToken(orgId)
    if (!line) {
      return NextResponse.json(
        { error: "LINE設定が見つかりません。先にLINE連携を設定してください。" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "画像ファイル (image) が必要です" },
        { status: 400 }
      )
    }

    const allowedTypes = ["image/jpeg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "画像形式は JPEG または PNG のみ対応しています" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    await uploadRichMenuImage(line.accessToken, id, imageBuffer, file.type)

    return NextResponse.json({
      success: true,
      message: "リッチメニュー画像をアップロードしました",
    })
  } catch (error) {
    console.error("RichMenu image POST error:", error)
    return NextResponse.json(
      { error: "リッチメニュー画像のアップロードに失敗しました" },
      { status: 500 }
    )
  }
}
