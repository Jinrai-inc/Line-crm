"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ModuleAccentBar } from "@/components/layout/module-accent-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Upload } from "lucide-react"

const PURPOSE_OPTIONS = [
  { value: "seminar", label: "セミナー事業" },
  { value: "marriage_school", label: "婚活スクール" },
  { value: "both", label: "両方" },
  { value: "other", label: "その他" },
]

const BUSINESS_CATEGORY_OPTIONS = [
  { value: "education", label: "教育" },
  { value: "consulting", label: "コンサルティング" },
  { value: "marriage_agency", label: "結婚相談所" },
  { value: "other", label: "その他" },
]

interface OrgData {
  name: string
  purpose: string
  description: string
  business_category: string
  contact_email: string
  contact_phone: string
  enabled_modules: string[]
}

export default function OrganizationSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrgData>({
    name: "",
    purpose: "",
    description: "",
    business_category: "",
    contact_email: "",
    contact_phone: "",
    enabled_modules: ["seminar", "marriage"],
  })

  useEffect(() => {
    fetchOrg()
  }, [])

  async function fetchOrg() {
    try {
      const res = await fetch("/api/organizations/me")
      if (!res.ok) throw new Error("取得に失敗しました")
      const data = await res.json()
      setForm({
        name: data.name ?? "",
        purpose: data.purpose ?? "",
        description: data.description ?? "",
        business_category: data.business_category ?? "",
        contact_email: data.contact_email ?? "",
        contact_phone: data.contact_phone ?? "",
        enabled_modules: data.enabled_modules ?? ["seminar", "marriage"],
      })
    } catch {
      toast({
        title: "エラー",
        description: "組織情報の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/organizations/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("保存に失敗しました")
      toast({
        title: "保存完了",
        description: "組織設定を保存しました",
      })
    } catch {
      toast({
        title: "エラー",
        description: "組織設定の保存に失敗しました",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleModule(module: string) {
    setForm((prev) => {
      const modules = prev.enabled_modules.includes(module)
        ? prev.enabled_modules.filter((m) => m !== module)
        : [...prev.enabled_modules, module]
      return { ...prev, enabled_modules: modules }
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <ModuleAccentBar />
        <PageHeader title="組織設定" description="組織の基本情報を管理します" />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ModuleAccentBar />
      <PageHeader title="組織設定" description="組織の基本情報を管理します" />

      <div className="max-w-2xl space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">組織名</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="組織名を入力してください"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">組織の目的・用途</Label>
              <Select
                value={form.purpose}
                onValueChange={(value) => setForm({ ...form, purpose: value })}
              >
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">組織の説明</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="組織の事業内容や特徴を入力してください"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_category">業種カテゴリ</Label>
              <Select
                value={form.business_category}
                onValueChange={(value) =>
                  setForm({ ...form, business_category: value })
                }
              >
                <SelectTrigger id="business_category">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 連絡先 */}
        <Card>
          <CardHeader>
            <CardTitle>連絡先</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">メールアドレス</Label>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) =>
                  setForm({ ...form, contact_email: e.target.value })
                }
                placeholder="info@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">電話番号</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) =>
                  setForm({ ...form, contact_phone: e.target.value })
                }
                placeholder="03-1234-5678"
              />
            </div>
          </CardContent>
        </Card>

        {/* ロゴ */}
        <Card>
          <CardHeader>
            <CardTitle>ロゴ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  ロゴ画像をアップロード
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PNG, JPG, SVG (最大 2MB)
                </p>
                <Button variant="outline" size="sm" className="mt-3" disabled>
                  ファイルを選択
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* モジュール設定 */}
        <Card>
          <CardHeader>
            <CardTitle>有効なモジュール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  セミナーモジュール
                </p>
                <p className="text-xs text-gray-500">
                  セミナーの管理・予約機能を有効にします
                </p>
              </div>
              <Switch
                checked={form.enabled_modules.includes("seminar")}
                onCheckedChange={() => toggleModule("seminar")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  婚活モジュール
                </p>
                <p className="text-xs text-gray-500">
                  婚活スクール管理機能を有効にします
                </p>
              </div>
              <Switch
                checked={form.enabled_modules.includes("marriage")}
                onCheckedChange={() => toggleModule("marriage")}
              />
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
