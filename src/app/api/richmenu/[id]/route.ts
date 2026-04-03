import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import {
  deleteRichMenu,
  setDefaultRichMenu,
  removeDefaultRichMenu,
  getDefaultRichMenu,
} from "@/lib/line/richmenu"

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

// リッチメニュー削除
export async function DELETE(
  _request: NextRequest,
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

    // デフォルトメニューの場合は先に解除
    const defaultMenuId = await getDefaultRichMenu(line.accessToken)
    if (defaultMenuId === id) {
      await removeDefaultRichMenu(line.accessToken)
    }

    await deleteRichMenu(line.accessToken, id)

    return NextResponse.json({ success: true, message: "リッチメニューを削除しました" })
  } catch (error) {
    console.error("RichMenu DELETE error:", error)
    return NextResponse.json(
      { error: "リッチメニューの削除に失敗しました" },
      { status: 500 }
    )
  }
}

// デフォルトリッチメニュー設定/解除
export async function PATCH(
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

    const body = await request.json()

    if (body.setAsDefault === true) {
      await setDefaultRichMenu(line.accessToken, id)
      return NextResponse.json({
        success: true,
        message: "デフォルトリッチメニューを設定しました",
      })
    } else if (body.setAsDefault === false) {
      // 現在のデフォルトがこのメニューの場合のみ解除
      const currentDefault = await getDefaultRichMenu(line.accessToken)
      if (currentDefault === id) {
        await removeDefaultRichMenu(line.accessToken)
      }
      return NextResponse.json({
        success: true,
        message: "デフォルトリッチメニューを解除しました",
      })
    }

    return NextResponse.json(
      { error: "setAsDefault (true/false) を指定してください" },
      { status: 400 }
    )
  } catch (error) {
    console.error("RichMenu PATCH error:", error)
    return NextResponse.json(
      { error: "リッチメニューの更新に失敗しました" },
      { status: 500 }
    )
  }
}
