"use client"

import { useState, useEffect, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  BarChart3,
  Eye,
} from "lucide-react"

interface TemplateData {
  id: string
  organization_id: string
  name: string
  template_type: string
  category: string
  content_json: Record<string, unknown>
  variables: unknown[]
  is_active: boolean
  used_count: number
  created_at: string
  updated_at: string
}

const TEMPLATE_TYPES = [
  { value: "text", label: "テキスト" },
  { value: "flex_bubble", label: "Flex Bubble" },
  { value: "flex_carousel", label: "Flex Carousel" },
] as const

const CATEGORIES = [
  { value: "welcome", label: "ウェルカム" },
  { value: "seminar", label: "セミナー" },
  { value: "coaching", label: "コーチング" },
  { value: "general", label: "一般" },
] as const

const TYPE_COLORS: Record<string, string> = {
  text: "#3B82F6",
  flex_bubble: "#8B5CF6",
  flex_carousel: "#06B6D4",
}

const CATEGORY_LABELS: Record<string, string> = {
  welcome: "ウェルカム",
  seminar: "セミナー",
  coaching: "コーチング",
  general: "一般",
}

const TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  flex_bubble: "Flex Bubble",
  flex_carousel: "Flex Carousel",
}

function getContentPreview(template: TemplateData): string {
  if (template.template_type === "text") {
    return (template.content_json?.text as string) || "(内容なし)"
  }
  const json = JSON.stringify(template.content_json)
  if (json.length <= 80) return json
  return json.slice(0, 80) + "..."
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState("text")
  const [formCategory, setFormCategory] = useState("general")
  const [formTextContent, setFormTextContent] = useState("")
  const [formJsonContent, setFormJsonContent] = useState("")
  const [formVariables, setFormVariables] = useState("")
  const [jsonError, setJsonError] = useState("")

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== "all") params.set("type", filterType)
      if (filterCategory !== "all") params.set("category", filterCategory)
      const query = params.toString()
      const res = await fetch(`/api/message-templates${query ? `?${query}` : ""}`)
      const json = await res.json()
      setTemplates(json.data ?? [])
    } catch {
      console.error("テンプレートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [filterType, filterCategory])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormName("")
    setFormType("text")
    setFormCategory("general")
    setFormTextContent("")
    setFormJsonContent("")
    setFormVariables("")
    setJsonError("")
  }

  const openCreateDialog = () => {
    resetForm()
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  const openEditDialog = (template: TemplateData) => {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormType(template.template_type)
    setFormCategory(template.category)
    if (template.template_type === "text") {
      setFormTextContent((template.content_json?.text as string) || "")
      setFormJsonContent("")
    } else {
      setFormTextContent("")
      setFormJsonContent(JSON.stringify(template.content_json, null, 2))
    }
    setFormVariables(
      template.variables && template.variables.length > 0
        ? JSON.stringify(template.variables, null, 2)
        : ""
    )
    setJsonError("")
    setDialogOpen(true)
  }

  const openDeleteDialog = (template: TemplateData) => {
    setSelectedTemplate(template)
    setDeleteOpen(true)
  }

  const openPreviewDialog = (template: TemplateData) => {
    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  const buildContentJson = (): Record<string, unknown> | null => {
    if (formType === "text") {
      return { text: formTextContent }
    }
    try {
      const parsed = JSON.parse(formJsonContent || "{}")
      setJsonError("")
      return parsed
    } catch {
      setJsonError("JSONの形式が正しくありません")
      return null
    }
  }

  const parseVariables = (): unknown[] => {
    if (!formVariables.trim()) return []
    try {
      return JSON.parse(formVariables)
    } catch {
      return []
    }
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    const contentJson = buildContentJson()
    if (contentJson === null) return

    setSaving(true)
    try {
      const body = {
        name: formName.trim(),
        template_type: formType,
        category: formCategory,
        content_json: contentJson,
        variables: parseVariables(),
      }

      const url = editingTemplate
        ? `/api/message-templates/${editingTemplate.id}`
        : "/api/message-templates"
      const method = editingTemplate ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        await fetchTemplates()
      }
    } catch {
      console.error("テンプレートの保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/message-templates/${selectedTemplate.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteOpen(false)
        setSelectedTemplate(null)
        await fetchTemplates()
      }
    } catch {
      console.error("テンプレートの削除に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="メッセージテンプレート"
        description="LINE配信用のメッセージテンプレートを管理します"
        action={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新規テンプレート
          </Button>
        }
      />

      {/* フィルター */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="テンプレートを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="タイプ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのタイプ</SelectItem>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* テンプレート一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? "検索結果が見つかりませんでした"
                : "テンプレートがまだありません"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                最初のテンプレートを作成
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group flex flex-col">
              <CardContent className="flex flex-col flex-1 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm truncate">{template.name}</h3>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openPreviewDialog(template)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => openDeleteDialog(template)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    className="text-white border-transparent text-xs"
                    style={{ backgroundColor: TYPE_COLORS[template.template_type] || "#6B7280" }}
                  >
                    {TYPE_LABELS[template.template_type] || template.template_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[template.category] || template.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">
                  {getContentPreview(template)}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <BarChart3 className="h-3 w-3" />
                  <span>使用回数: {template.used_count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 作成・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "テンプレートを編集" : "新規テンプレート作成"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "テンプレートの内容を変更します"
                : "LINE配信用の新しいメッセージテンプレートを作成します"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">テンプレート名</Label>
              <Input
                id="template-name"
                placeholder="例: ウェルカムメッセージ"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>タイプ</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* コンテンツ入力 */}
            <Tabs defaultValue="content" className="w-full">
              <TabsList>
                <TabsTrigger value="content">コンテンツ</TabsTrigger>
                <TabsTrigger value="variables">変数</TabsTrigger>
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-2 mt-3">
                {formType === "text" ? (
                  <>
                    <Label htmlFor="text-content">メッセージ内容</Label>
                    <Textarea
                      id="text-content"
                      placeholder="メッセージを入力してください..."
                      rows={6}
                      value={formTextContent}
                      onChange={(e) => setFormTextContent(e.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="json-content">Flex Message JSON</Label>
                    <Textarea
                      id="json-content"
                      placeholder='{"type": "bubble", "body": { ... }}'
                      rows={12}
                      className="font-mono text-xs"
                      value={formJsonContent}
                      onChange={(e) => {
                        setFormJsonContent(e.target.value)
                        setJsonError("")
                      }}
                    />
                    {jsonError && (
                      <p className="text-xs text-red-500">{jsonError}</p>
                    )}
                  </>
                )}
              </TabsContent>
              <TabsContent value="variables" className="space-y-2 mt-3">
                <Label htmlFor="variables">変数定義 (JSON配列)</Label>
                <Textarea
                  id="variables"
                  placeholder='[{"key": "name", "label": "名前", "default": "ゲスト"}]'
                  rows={6}
                  className="font-mono text-xs"
                  value={formVariables}
                  onChange={(e) => setFormVariables(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  テンプレート内で使用する変数を定義します。JSON配列形式で入力してください。
                </p>
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="rounded-lg border bg-gray-50 p-4 min-h-[200px]">
                  <p className="text-xs text-gray-400 mb-2">プレビュー</p>
                  {formType === "text" ? (
                    <div className="bg-white rounded-lg p-3 shadow-sm max-w-[280px]">
                      <p className="text-sm whitespace-pre-wrap">
                        {formTextContent || "(内容なし)"}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-700">
                        {(() => {
                          try {
                            return JSON.stringify(
                              JSON.parse(formJsonContent || "{}"),
                              null,
                              2
                            )
                          } catch {
                            return formJsonContent || "(内容なし)"
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "保存" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プレビューダイアログ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {TYPE_LABELS[selectedTemplate?.template_type || ""] || selectedTemplate?.template_type}
              {" / "}
              {CATEGORY_LABELS[selectedTemplate?.category || ""] || selectedTemplate?.category}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-gray-50 p-4">
            {selectedTemplate?.template_type === "text" ? (
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[280px]">
                <p className="text-sm whitespace-pre-wrap">
                  {(selectedTemplate?.content_json?.text as string) || "(内容なし)"}
                </p>
              </div>
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-700">
                {JSON.stringify(selectedTemplate?.content_json, null, 2)}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              テンプレート「{selectedTemplate?.name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
