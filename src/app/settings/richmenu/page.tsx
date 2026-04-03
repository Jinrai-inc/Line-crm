"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Plus,
  Trash2,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  LayoutGrid,
  Upload,
} from "lucide-react"
import { useAccentColor } from "@/hooks/use-accent-color"

// ---------- Types ----------

type Template = "6-grid" | "3-grid" | "2-grid"
type ActionType = "message" | "uri" | "postback"

interface AreaAction {
  type: ActionType
  text?: string
  uri?: string
  data?: string
  label?: string
}

interface AreaConfig {
  action: AreaAction
}

interface RichMenu {
  id: string
  name: string
  chatBarText: string
  template?: Template
  areas?: AreaConfig[]
}

interface CreateFormData {
  name: string
  chatBarText: string
  template: Template
  areas: AreaConfig[]
  setAsDefault: boolean
  imageFile: File | null
}

// ---------- Helpers ----------

function areaCountForTemplate(template: Template): number {
  switch (template) {
    case "6-grid":
      return 6
    case "3-grid":
      return 3
    case "2-grid":
      return 2
  }
}

function makeEmptyAreas(template: Template): AreaConfig[] {
  return Array.from({ length: areaCountForTemplate(template) }, () => ({
    action: { type: "message" as ActionType, text: "" },
  }))
}

const INITIAL_FORM: CreateFormData = {
  name: "",
  chatBarText: "メニュー",
  template: "6-grid",
  areas: makeEmptyAreas("6-grid"),
  setAsDefault: false,
  imageFile: null,
}

// ---------- Template Preview Component ----------

function TemplatePreview({
  template,
  selected,
  onClick,
}: {
  template: Template
  selected: boolean
  onClick: () => void
}) {
  const accentColor = useAccentColor()
  const borderColor = selected ? accentColor : "#d1d5db"
  const bgColor = selected ? `${accentColor}10` : "transparent"

  const labelMap: Record<Template, string> = {
    "6-grid": "6分割",
    "3-grid": "3分割",
    "2-grid": "2分割",
  }

  const renderGrid = () => {
    const cellClass =
      "flex items-center justify-center border border-gray-300 text-[10px] text-gray-500 bg-white"

    if (template === "6-grid") {
      return (
        <div className="grid grid-cols-3 grid-rows-2 gap-0 w-full h-16">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={cellClass}>
              エリア{n}
            </div>
          ))}
        </div>
      )
    }
    if (template === "3-grid") {
      return (
        <div className="grid grid-cols-1 grid-rows-3 gap-0 w-full h-16">
          {[1, 2, 3].map((n) => (
            <div key={n} className={cellClass}>
              エリア{n}
            </div>
          ))}
        </div>
      )
    }
    // 2-grid
    return (
      <div className="grid grid-cols-1 grid-rows-2 gap-0 w-full h-12">
        {[1, 2].map((n) => (
          <div key={n} className={cellClass}>
            エリア{n}
          </div>
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors cursor-pointer"
      style={{
        borderColor,
        backgroundColor: bgColor,
      }}
    >
      {renderGrid()}
      <span className="text-xs font-medium text-gray-700">
        {labelMap[template]}
      </span>
    </button>
  )
}

// ---------- Area Editor ----------

function AreaEditor({
  index,
  area,
  onChange,
}: {
  index: number
  area: AreaConfig
  onChange: (updated: AreaConfig) => void
}) {
  const handleActionTypeChange = (type: string) => {
    const actionType = type as ActionType
    const newAction: AreaAction = { type: actionType }
    if (actionType === "message") newAction.text = ""
    if (actionType === "uri") newAction.uri = ""
    if (actionType === "postback") {
      newAction.data = ""
      newAction.label = ""
    }
    onChange({ action: newAction })
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-3">
      <p className="text-sm font-medium text-gray-700">エリア{index + 1}</p>

      <div className="space-y-1.5">
        <Label className="text-xs">アクション種別</Label>
        <Select
          value={area.action.type}
          onValueChange={handleActionTypeChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message">テキスト送信</SelectItem>
            <SelectItem value="uri">URL</SelectItem>
            <SelectItem value="postback">ポストバック</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {area.action.type === "message" && (
        <div className="space-y-1.5">
          <Label className="text-xs">送信テキスト</Label>
          <Input
            className="h-8 text-sm"
            value={area.action.text ?? ""}
            onChange={(e) =>
              onChange({
                action: { ...area.action, text: e.target.value },
              })
            }
            placeholder="ユーザーに送信されるテキスト"
          />
        </div>
      )}

      {area.action.type === "uri" && (
        <div className="space-y-1.5">
          <Label className="text-xs">URL</Label>
          <Input
            className="h-8 text-sm"
            type="url"
            value={area.action.uri ?? ""}
            onChange={(e) =>
              onChange({
                action: { ...area.action, uri: e.target.value },
              })
            }
            placeholder="https://example.com"
          />
        </div>
      )}

      {area.action.type === "postback" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">データ</Label>
            <Input
              className="h-8 text-sm"
              value={area.action.data ?? ""}
              onChange={(e) =>
                onChange({
                  action: { ...area.action, data: e.target.value },
                })
              }
              placeholder="action=buy&itemid=123"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ラベル</Label>
            <Input
              className="h-8 text-sm"
              value={area.action.label ?? ""}
              onChange={(e) =>
                onChange({
                  action: { ...area.action, label: e.target.value },
                })
              }
              placeholder="購入する"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ---------- Main Page ----------

export default function RichMenuSettingsPage() {
  const accentColor = useAccentColor()

  // List state
  const [richMenus, setRichMenus] = useState<RichMenu[]>([])
  const [defaultRichMenuId, setDefaultRichMenuId] = useState<string | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  )

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateFormData>({ ...INITIAL_FORM })
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RichMenu | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // ---------- Fetch ----------

  const fetchRichMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/richmenu")
      if (!res.ok) throw new Error("取得に失敗しました")
      const data = await res.json()
      setRichMenus(data.data || [])
      setDefaultRichMenuId(data.defaultRichMenuId ?? null)
    } catch (error) {
      console.error("リッチメニューの取得に失敗:", error)
      setToast({ type: "error", message: "リッチメニューの取得に失敗しました" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRichMenus()
  }, [fetchRichMenus])

  // ---------- Set / Unset Default ----------

  const handleSetDefault = async (menuId: string, setAsDefault: boolean) => {
    setActionLoading((prev) => ({ ...prev, [menuId]: true }))
    try {
      const res = await fetch(`/api/richmenu/${menuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setAsDefault }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "更新に失敗しました")
      }
      setToast({
        type: "success",
        message: setAsDefault
          ? "デフォルトに設定しました"
          : "デフォルトを解除しました",
      })
      await fetchRichMenus()
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "更新に失敗しました"
      setToast({ type: "error", message: msg })
    } finally {
      setActionLoading((prev) => ({ ...prev, [menuId]: false }))
    }
  }

  // ---------- Delete ----------

  const openDeleteDialog = (menu: RichMenu) => {
    setDeleteTarget(menu)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/richmenu/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "削除に失敗しました")
      }
      setToast({ type: "success", message: "リッチメニューを削除しました" })
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      await fetchRichMenus()
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "削除に失敗しました"
      setToast({ type: "error", message: msg })
    } finally {
      setDeleting(false)
    }
  }

  // ---------- Create ----------

  const openCreateDialog = () => {
    setFormData({
      ...INITIAL_FORM,
      areas: makeEmptyAreas(INITIAL_FORM.template),
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setDialogOpen(true)
  }

  const handleTemplateChange = (template: Template) => {
    setFormData((prev) => ({
      ...prev,
      template,
      areas: makeEmptyAreas(template),
    }))
  }

  const handleAreaChange = (index: number, area: AreaConfig) => {
    setFormData((prev) => {
      const areas = [...prev.areas]
      areas[index] = area
      return { ...prev, areas }
    })
  }

  const handleCreate = async () => {
    // Validation
    if (!formData.name.trim()) {
      setToast({ type: "error", message: "リッチメニュー名を入力してください" })
      return
    }
    if (!formData.chatBarText.trim()) {
      setToast({
        type: "error",
        message: "チャットバーテキストを入力してください",
      })
      return
    }
    if (!formData.imageFile) {
      setToast({ type: "error", message: "画像を選択してください" })
      return
    }

    setCreating(true)
    try {
      // Step 1: Create the rich menu
      const createRes = await fetch("/api/richmenu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          chatBarText: formData.chatBarText,
          template: formData.template,
          areas: formData.areas,
          setAsDefault: formData.setAsDefault,
        }),
      })

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}))
        throw new Error(data.error || "リッチメニューの作成に失敗しました")
      }

      const createData = await createRes.json()
      const newMenuId = createData.id || createData.data?.id || createData.richMenuId

      if (!newMenuId) {
        throw new Error("リッチメニューIDの取得に失敗しました")
      }

      // Step 2: Upload the image
      const imageFormData = new FormData()
      imageFormData.append("image", formData.imageFile)

      const imageRes = await fetch(`/api/richmenu/${newMenuId}/image`, {
        method: "POST",
        body: imageFormData,
      })

      if (!imageRes.ok) {
        const data = await imageRes.json().catch(() => ({}))
        throw new Error(
          data.error || "画像のアップロードに失敗しました（メニューは作成済み）"
        )
      }

      setToast({ type: "success", message: "リッチメニューを作成しました" })
      setDialogOpen(false)
      await fetchRichMenus()
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "リッチメニューの作成に失敗しました"
      setToast({ type: "error", message: msg })
    } finally {
      setCreating(false)
    }
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <AppLayout>
        <ModuleAccentBar />
        <PageHeader
          title="リッチメニュー管理"
          description="LINE公式アカウントのリッチメニューを管理します"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader
        title="リッチメニュー管理"
        description="LINE公式アカウントのリッチメニューを管理します"
      />

      <div className="max-w-4xl space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            リッチメニュー一覧
            {richMenus.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({richMenus.length}件)
              </span>
            )}
          </h2>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* Menu list */}
        {richMenus.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <LayoutGrid
                  className="h-6 w-6"
                  style={{ color: accentColor }}
                />
              </div>
              <p className="text-sm font-medium text-gray-900">
                リッチメニューが登録されていません
              </p>
              <p className="mt-1 text-sm text-gray-500">
                「新規作成」ボタンからリッチメニューを作成してください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {richMenus.map((menu) => {
              const isDefault = defaultRichMenuId === menu.id
              const isActionLoading = actionLoading[menu.id] ?? false

              return (
                <Card key={menu.id} className="overflow-hidden">
                  <div
                    className="h-1"
                    style={{ backgroundColor: accentColor }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {menu.name}
                        </CardTitle>
                        {isDefault && (
                          <Badge variant="default" className="text-xs">
                            デフォルト
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isDefault ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(menu.id, false)}
                            disabled={isActionLoading}
                            title="デフォルト解除"
                            className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                            <span className="ml-1 text-xs">デフォルト解除</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(menu.id, true)}
                            disabled={isActionLoading}
                            title="デフォルトに設定"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                            <span className="ml-1 text-xs">
                              デフォルトに設定
                            </span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(menu)}
                          title="削除"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          チャットバーテキスト
                        </p>
                        <p className="mt-0.5 text-sm text-gray-900">
                          {menu.chatBarText}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          メニューID
                        </p>
                        <p className="mt-0.5 text-sm font-mono text-gray-900 truncate">
                          {menu.id}
                        </p>
                      </div>
                    </div>
                    {/* Placeholder for image */}
                    <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                      <span className="text-xs text-gray-400">
                        {menu.name} のリッチメニュー画像
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>リッチメニューを新規作成</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="rm-name">リッチメニュー名</Label>
              <Input
                id="rm-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="例: メインメニュー"
              />
            </div>

            {/* Chat bar text */}
            <div className="space-y-2">
              <Label htmlFor="rm-chatbar">チャットバーテキスト</Label>
              <Input
                id="rm-chatbar"
                value={formData.chatBarText}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    chatBarText: e.target.value,
                  }))
                }
                placeholder="メニュー"
              />
            </div>

            {/* Template selection */}
            <div className="space-y-2">
              <Label>テンプレート</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["6-grid", "3-grid", "2-grid"] as Template[]).map(
                  (tmpl) => (
                    <TemplatePreview
                      key={tmpl}
                      template={tmpl}
                      selected={formData.template === tmpl}
                      onClick={() => handleTemplateChange(tmpl)}
                    />
                  )
                )}
              </div>
            </div>

            {/* Area configs */}
            <div className="space-y-2">
              <Label>エリア設定</Label>
              <div className="space-y-3">
                {formData.areas.map((area, i) => (
                  <AreaEditor
                    key={`${formData.template}-${i}`}
                    index={i}
                    area={area}
                    onChange={(updated) => handleAreaChange(i, updated)}
                  />
                ))}
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label htmlFor="rm-image">
                画像アップロード{" "}
                <span className="text-red-500 text-xs">*必須</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  id="rm-image"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setFormData((prev) => ({ ...prev, imageFile: file }))
                  }}
                  className="text-sm"
                />
                {formData.imageFile && (
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <Upload className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">
                      {formData.imageFile.name}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                PNG または JPEG 形式の画像を選択してください。
              </p>
            </div>

            {/* Set as default */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="rm-default"
                checked={formData.setAsDefault}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    setAsDefault: checked === true,
                  }))
                }
              />
              <Label htmlFor="rm-default" className="text-sm cursor-pointer">
                デフォルトに設定する
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                "作成"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>リッチメニューの削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            「{deleteTarget?.name}」を削除しますか？この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
