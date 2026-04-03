"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAccentColor } from "@/hooks/use-accent-color"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"

interface FollowupButton {
  label: string
  tagName: string
  responseMessage: string
  responseUrl: string
}

const emptyButton: FollowupButton = {
  label: "",
  tagName: "",
  responseMessage: "",
  responseUrl: "",
}

export default function SeminarFollowupPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const accentColor = useAccentColor()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [thankYouMessage, setThankYouMessage] = useState("")
  const [buttons, setButtons] = useState<FollowupButton[]>([])

  const fetchFollowup = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/seminars/${id}/followup`)
      const json = await res.json()
      if (json.data) {
        setEnabled(json.data.enabled ?? false)
        setThankYouMessage(json.data.thank_you_message ?? "")
        setButtons(json.data.buttons ?? [])
      }
    } catch {
      console.error("フォローアップ設定の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchFollowup()
  }, [id, fetchFollowup])

  async function handleSave() {
    try {
      setSaving(true)
      const res = await fetch(`/api/seminars/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thankYouMessage,
          buttons,
          enabled,
        }),
      })
      if (!res.ok) {
        console.error("保存に失敗しました")
      }
    } catch {
      console.error("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  function addButton() {
    if (buttons.length >= 3) return
    setButtons([...buttons, { ...emptyButton }])
  }

  function removeButton(index: number) {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  function updateButton(index: number, field: keyof FollowupButton, value: string) {
    setButtons(buttons.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)))
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="フォローアップ設定"
        description="セミナー参加者への自動フォローアップメッセージを設定します"
        action={
          <Button variant="outline" onClick={() => router.push(`/seminars/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            セミナー詳細に戻る
          </Button>
        }
      />

      <div className="space-y-6 max-w-2xl">
        {/* 有効/無効トグル */}
        <Card>
          <CardHeader>
            <CardTitle>フォローアップ配信</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">自動フォローアップを有効にする</p>
                <p className="text-sm text-gray-500">
                  セミナー参加者にフォローアップメッセージを自動送信します
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* お礼メッセージ */}
        <Card>
          <CardHeader>
            <CardTitle>お礼メッセージ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="thank-you-message">メッセージ本文</Label>
            <Textarea
              id="thank-you-message"
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              placeholder="セミナーにご参加いただきありがとうございました！"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              {"{name}"} と入力すると参加者の名前に置き換わります
            </p>
          </CardContent>
        </Card>

        {/* ボタン設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ボタン設定</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addButton}
                disabled={buttons.length >= 3}
              >
                <Plus className="h-4 w-4 mr-1" />
                ボタン追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {buttons.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                ボタンが設定されていません。「ボタン追加」で追加してください。
              </p>
            ) : (
              buttons.map((btn, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      ボタン {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeButton(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`btn-label-${index}`}>ボタンラベル</Label>
                      <Input
                        id={`btn-label-${index}`}
                        value={btn.label}
                        onChange={(e) => updateButton(index, "label", e.target.value)}
                        placeholder="例: IBJ会員です"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`btn-tag-${index}`}>自動付与タグ</Label>
                      <Input
                        id={`btn-tag-${index}`}
                        value={btn.tagName}
                        onChange={(e) => updateButton(index, "tagName", e.target.value)}
                        placeholder="例: IBJ会員"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`btn-response-${index}`}>応答メッセージ</Label>
                    <Input
                      id={`btn-response-${index}`}
                      value={btn.responseMessage}
                      onChange={(e) =>
                        updateButton(index, "responseMessage", e.target.value)
                      }
                      placeholder="例: 特典をお受け取りください！"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`btn-url-${index}`}>応答URL</Label>
                    <Input
                      id={`btn-url-${index}`}
                      value={btn.responseUrl}
                      onChange={(e) => updateButton(index, "responseUrl", e.target.value)}
                      placeholder="https://example.com/benefit"
                    />
                  </div>
                </div>
              ))
            )}
            {buttons.length > 0 && buttons.length < 3 && (
              <p className="text-xs text-gray-500">
                最大3つまでボタンを追加できます（残り{3 - buttons.length}つ）
              </p>
            )}
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: accentColor }}
            className="text-white hover:opacity-90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存する
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
