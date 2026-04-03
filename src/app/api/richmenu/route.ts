import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import {
  listRichMenus,
  createRichMenu,
  setDefaultRichMenu,
  getDefaultRichMenu,
  type RichMenuArea,
} from "@/lib/line/richmenu"

type TemplateName = "6-grid" | "3-grid" | "2-grid"

function generateAreas(
  template: TemplateName,
  actions: { action: { type: string; [key: string]: unknown } }[]
): RichMenuArea[] {
  switch (template) {
    case "6-grid": {
      // 2x3 grid on 2500x1686 canvas
      const cellWidth = 1250
      const cellHeight = 562
      const areas: RichMenuArea[] = []
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const index = row * 2 + col
          if (index >= actions.length) break
          areas.push({
            bounds: {
              x: col * cellWidth,
              y: row * cellHeight,
              width: cellWidth,
              height: cellHeight,
            },
            action: actions[index].action,
          })
        }
      }
      return areas
    }
    case "3-grid": {
      // 1x3 on 2500x1686
      const cellHeight = 562
      return actions.slice(0, 3).map((a, i) => ({
        bounds: {
          x: 0,
          y: i * cellHeight,
          width: 2500,
          height: cellHeight,
        },
        action: a.action,
      }))
    }
    case "2-grid": {
      // 1x2 on 2500x843
      const cellHeight = Math.floor(843 / 2)
      return actions.slice(0, 2).map((a, i) => ({
        bounds: {
          x: 0,
          y: i * cellHeight,
          width: 2500,
          height: cellHeight,
        },
        action: a.action,
      }))
    }
    default:
      throw new Error(`不明なテンプレート: ${template}`)
  }
}

function getCanvasSize(template: TemplateName): {
  width: number
  height: number
} {
  switch (template) {
    case "6-grid":
    case "3-grid":
      return { width: 2500, height: 1686 }
    case "2-grid":
      return { width: 2500, height: 843 }
    default:
      return { width: 2500, height: 1686 }
  }
}

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

// リッチメニュー一覧取得
export async function GET() {
  try {
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

    const [menusResult, defaultMenuId] = await Promise.all([
      listRichMenus(line.accessToken),
      getDefaultRichMenu(line.accessToken),
    ])

    const menus = (menusResult.richmenus || []).map((menu) => ({
      ...menu,
      isDefault:
        defaultMenuId !== null &&
        "richMenuId" in menu &&
        (menu as unknown as { richMenuId: string }).richMenuId ===
          defaultMenuId,
    }))

    return NextResponse.json({ data: menus, defaultRichMenuId: defaultMenuId })
  } catch (error) {
    console.error("RichMenu GET error:", error)
    return NextResponse.json(
      { error: "リッチメニュー一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// リッチメニュー作成
export async function POST(request: NextRequest) {
  try {
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
    const { name, chatBarText, template, areas: areaActions, setAsDefault } = body

    if (!name || !chatBarText || !template || !areaActions) {
      return NextResponse.json(
        { error: "name, chatBarText, template, areas は必須です" },
        { status: 400 }
      )
    }

    const validTemplates: TemplateName[] = ["6-grid", "3-grid", "2-grid"]
    if (!validTemplates.includes(template)) {
      return NextResponse.json(
        { error: "template は 6-grid, 3-grid, 2-grid のいずれかです" },
        { status: 400 }
      )
    }

    const size = getCanvasSize(template as TemplateName)
    const computedAreas = generateAreas(
      template as TemplateName,
      areaActions
    )

    if (computedAreas.length === 0) {
      return NextResponse.json(
        { error: "少なくとも1つのエリアアクションが必要です" },
        { status: 400 }
      )
    }

    const richMenuId = await createRichMenu(line.accessToken, {
      size,
      selected: true,
      name,
      chatBarText,
      areas: computedAreas,
    })

    if (setAsDefault) {
      await setDefaultRichMenu(line.accessToken, richMenuId)
    }

    return NextResponse.json(
      { data: { richMenuId }, message: "リッチメニューを作成しました" },
      { status: 201 }
    )
  } catch (error) {
    console.error("RichMenu POST error:", error)
    return NextResponse.json(
      { error: "リッチメニューの作成に失敗しました" },
      { status: 500 }
    )
  }
}
