"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2 } from "lucide-react"

interface FormErrors {
  title?: string
  date?: string
}

export default function SeminarNewPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    venue: "",
    capacity: 20,
  })

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!form.title.trim()) newErrors.title = "タイトルは必須です"
    if (!form.date) newErrors.date = "日付は必須です"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      setSubmitting(true)
      const res = await fetch("/api/seminars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const json = await res.json()
        const newId = json.data?.id
        router.push(newId ? `/seminars/${newId}` : "/seminars")
      }
    } catch {
      console.error("セミナーの作成に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="セミナー作成"
        description="新しいセミナーを作成します"
        action={
          <Button variant="outline" onClick={() => router.push("/seminars")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            一覧に戻る
          </Button>
        }
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>セミナー情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="title">
                  タイトル <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="セミナーのタイトルを入力"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="セミナーの説明を入力"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">
                    日付 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={errors.date ? "border-red-500" : ""}
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="venue">会場</Label>
                  <Input
                    id="venue"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="会場名を入力"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startTime">開始時間</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">終了時間</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">定員</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/seminars")}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  作成する
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
