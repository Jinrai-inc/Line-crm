"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Tag,
  Users,
  Loader2,
} from "lucide-react"

interface TagData {
  id: string
  name: string
  color: string
  organization_id: string
  created_at: string
  friend_count?: number
}

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
]

export default function TagsPage() {
  const accentColor = useAccentColor()
  const [tags, setTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<TagData | null>(null)
  const [formName, setFormName] = useState("")
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tags")
      const json = await res.json()
      setTags(json.data ?? [])
    } catch {
      console.error("タグの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), color: formColor }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setFormName("")
        setFormColor(PRESET_COLORS[0])
        await fetchTags()
      }
    } catch {
      console.error("タグの作成に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedTag || !formName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tags/${selectedTag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), color: formColor }),
      })
      if (res.ok) {
        setEditOpen(false)
        setSelectedTag(null)
        await fetchTags()
      }
    } catch {
      console.error("タグの更新に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTag) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tags/${selectedTag.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteOpen(false)
        setSelectedTag(null)
        await fetchTags()
      }
    } catch {
      console.error("タグの削除に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (tag: TagData) => {
    setSelectedTag(tag)
    setFormName(tag.name)
    setFormColor(tag.color)
    setEditOpen(true)
  }

  const openDeleteDialog = (tag: TagData) => {
    setSelectedTag(tag)
    setDeleteOpen(true)
  }

  const openCreateDialog = () => {
    setFormName("")
    setFormColor(PRESET_COLORS[0])
    setCreateOpen(true)
  }

  function ColorPicker({
    value,
    onChange,
  }: {
    value: string
    onChange: (color: string) => void
  }) {
    return (
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === color
                ? "border-gray-900 scale-110"
                : "border-transparent hover:border-gray-300"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="タグ管理"
        description="友だちを分類するためのタグを管理します"
        action={
          <Button onClick={openCreateDialog} style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            新規タグ
          </Button>
        }
      />

      {/* 検索 */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="タグを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* タグ一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      ) : filteredTags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? "検索結果が見つかりませんでした"
                : "タグがまだありません"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                最初のタグを作成
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map((tag) => (
            <Card key={tag.id} className="group">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    className="shrink-0 text-white border-transparent"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                  {tag.friend_count !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      {tag.friend_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(tag)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => openDeleteDialog(tag)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新規作成ダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規タグ作成</DialogTitle>
            <DialogDescription>
              友だちを分類するための新しいタグを作成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">タグ名</Label>
              <Input
                id="tag-name"
                placeholder="例: VIP顧客"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>カラー</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">プレビュー:</span>
                <Badge
                  className="text-white border-transparent"
                  style={{ backgroundColor: formColor }}
                >
                  {formName || "タグ名"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || saving}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグを編集</DialogTitle>
            <DialogDescription>タグの名前やカラーを変更します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">タグ名</Label>
              <Input
                id="edit-tag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>カラー</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">プレビュー:</span>
                <Badge
                  className="text-white border-transparent"
                  style={{ backgroundColor: formColor }}
                >
                  {formName || "タグ名"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button onClick={handleEdit} disabled={!formName.trim() || saving} style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグを削除</DialogTitle>
            <DialogDescription>
              タグ「{selectedTag?.name}」を削除しますか？この操作は取り消せません。
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
