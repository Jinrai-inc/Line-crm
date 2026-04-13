"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Send,
  Tag,
  X,
  Plus,
  Calendar,
  MessageSquare,
  Edit,
  User,
  Loader2,
} from "lucide-react"
import { formatDate, formatRelativeTime } from "@/lib/utils/date"

interface FriendDetail {
  id: string
  line_user_id: string
  display_name: string | null
  custom_name: string | null
  picture_url: string | null
  status: string
  memo: string | null
  first_added_at: string | null
  last_interaction_at: string | null
  tags: { id: string; name: string; color: string }[]
  attendances: {
    id: string
    status: string
    applied_at: string | null
    seminar: { id: string; title: string; date: string | null }
  }[]
  message_logs: {
    id: string
    direction: string
    message_type: string
    content: string | null
    event_type: string
    sent_at: string
  }[]
}

interface AvailableTag {
  id: string
  name: string
  color: string
}

// メッセージ履歴のイベント種別ごとに人間が読める形式に整形する
//
// DB に入っている content はクエリ文字列形式 (例:
//   "seminar_id=XXX&button_index=0&tag=個別相談希望"
// ) で機械可読だが、管理画面上ではそのままだと意味不明なので、種別ごとに
// パースして「何が起きたか」を日本語で表示する。
//
// 戻り値:
//   - kind: "outgoing" | "incoming" | "system"
//     ├ "outgoing": 緑バブル右寄せ (運営からの送信)
//     ├ "incoming": グレーバブル左寄せ (お客様からの受信)
//     └ "system":   中央配置の薄いバッジ (友だち追加/解除など)
//   - label: バッジに表示する種別名
//   - text:  本文として表示するテキスト
function formatHistoryEntry(log: {
  event_type: string
  content: string | null
  message_type: string
}): { kind: "outgoing" | "incoming" | "system"; label: string; text: string } {
  // フォローアップボタン応答（postback の一種）
  // content 例: "seminar_id=XXX&button_index=0&tag=個別相談希望"
  if (log.event_type === "followup_response") {
    const params = new URLSearchParams(log.content || "")
    const tag = params.get("tag")
    return {
      kind: "incoming",
      label: "フォローアップ応答",
      text: tag
        ? `「${tag}」を選択しました`
        : "フォローアップのボタンを選択しました",
    }
  }

  // アンケート選択肢回答
  // content 例: "survey_id=XXX&q=0&c=1&answer=男性&tag=男性"
  if (log.event_type === "survey_answer") {
    const params = new URLSearchParams(log.content || "")
    const answer = params.get("answer")
    const q = params.get("q")
    const qLabel = q !== null && q !== "" ? `Q${parseInt(q, 10) + 1}: ` : ""
    return {
      kind: "incoming",
      label: "アンケート回答",
      text: answer
        ? `${qLabel}「${answer}」と回答しました`
        : "アンケートに回答しました",
    }
  }

  // 友だち追加
  if (log.event_type === "follow") {
    return {
      kind: "system",
      label: "友だち追加",
      text: "友だちに追加されました",
    }
  }

  // 友だち解除 / ブロック
  if (log.event_type === "unfollow") {
    return {
      kind: "system",
      label: "ブロック",
      text: "友だちが解除されました",
    }
  }

  // 汎用ポストバック (個別ボタン押下など)
  if (log.event_type === "postback") {
    return {
      kind: "incoming",
      label: "ボタン操作",
      text: log.content || "ボタンを操作しました",
    }
  }

  // 運営側からの送信 (配信・個別メッセージ等)
  if (log.event_type === "message_send") {
    return {
      kind: "outgoing",
      label: "送信",
      text: log.content || `[${log.message_type || "メッセージ"}]`,
    }
  }

  // お客様からのテキスト/画像/スタンプ等の受信
  if (log.event_type === "message") {
    return {
      kind: "incoming",
      label: "メッセージ",
      text: log.content || `[${log.message_type || "メッセージ"}]`,
    }
  }

  // 上記以外（未知のイベント）はそのまま表示
  return {
    kind: "incoming",
    label: log.event_type,
    text: log.content || `[${log.message_type || ""}]`,
  }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "アクティブ", className: "bg-green-100 text-green-800" },
  blocked: { label: "ブロック", className: "bg-red-100 text-red-800" },
  unfollowed: { label: "フォロー解除", className: "bg-gray-100 text-gray-600" },
}

const attendanceStatusConfig: Record<string, { label: string; className: string }> = {
  applied: { label: "申込", className: "bg-blue-100 text-blue-800" },
  confirmed: { label: "確認済", className: "bg-yellow-100 text-yellow-800" },
  attended: { label: "出席", className: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800" },
}

export default function FriendDetailPage() {
  const accentColor = useAccentColor()
  const params = useParams()
  const router = useRouter()
  const friendId = params.id as string

  const [friend, setFriend] = useState<FriendDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ customName: "", memo: "" })
  const [saving, setSaving] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([])

  const fetchFriend = useCallback(async () => {
    try {
      const res = await fetch(`/api/friends/${friendId}`)
      if (res.ok) {
        const json = await res.json()
        const raw = json.data
        // Transform API response to match FriendDetail interface
        const transformed: FriendDetail = {
          ...raw,
          tags: (raw.friend_tags || []).map((ft: { tags: { id: string; name: string; color: string } }) => ft.tags).filter(Boolean),
          attendances: (raw.attendances || []).map((att: { id: string; status: string; applied_at: string | null; seminars: { id: string; title: string; event_date: string | null } }) => ({
            ...att,
            seminar: att.seminars ? { id: att.seminars.id, title: att.seminars.title, date: att.seminars.event_date } : { id: "", title: "不明", date: null },
          })),
          message_logs: (raw.message_logs || []).map((log: { id: string; event_type: string; message_type: string; content: string | null; created_at: string }) => ({
            ...log,
            direction: log.event_type === "message_send" ? "outgoing" : "incoming",
            sent_at: log.created_at,
          })),
        }
        setFriend(transformed)
      }
    } catch (err) {
      console.error("Failed to fetch friend:", err)
    } finally {
      setLoading(false)
    }
  }, [friendId])

  useEffect(() => {
    fetchFriend()
  }, [fetchFriend])

  // 詳細ページを開いた時に既読にする
  useEffect(() => {
    if (friendId) {
      fetch(`/api/friends/${friendId}/read`, { method: "POST" }).catch(() => {})
    }
  }, [friendId])

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/friends/${friendId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (res.ok) {
        setMessage("")
        fetchFriend()
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditOpen(false)
        fetchFriend()
      }
    } catch (err) {
      console.error("Failed to update:", err)
    } finally {
      setSaving(false)
    }
  }

  // CRM 側からの手動ブロック / ブロック解除
  // status を "blocked" / "active" にトグルする。
  // 配信ロジックは status="active" のみを対象とするため、これだけで
  // 今後の配信から除外 / 復帰できる。
  const [statusChanging, setStatusChanging] = useState(false)
  const handleToggleBlock = async () => {
    if (!friend || statusChanging) return
    const isCurrentlyBlocked = friend.status === "blocked" || friend.status === "unfollowed"
    const nextStatus = isCurrentlyBlocked ? "active" : "blocked"
    const confirmMessage = isCurrentlyBlocked
      ? "この友だちのブロックを解除します。今後の配信対象に再び含まれます。よろしいですか？"
      : "この友だちをブロックします。今後の配信対象から除外されます（LINE 側の友だち関係には影響しません）。よろしいですか？"
    if (!confirm(confirmMessage)) return

    setStatusChanging(true)
    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        await fetchFriend()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error || "ステータスの更新に失敗しました")
      }
    } catch (err) {
      console.error("Failed to toggle block:", err)
      alert("ステータスの更新に失敗しました")
    } finally {
      setStatusChanging(false)
    }
  }

  const handleAddTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/friends/${friendId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      })
      if (res.ok) {
        setTagDialogOpen(false)
        fetchFriend()
      }
    } catch (err) {
      console.error("Failed to add tag:", err)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/friends/${friendId}/tags?tagId=${tagId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchFriend()
      }
    } catch (err) {
      console.error("Failed to remove tag:", err)
    }
  }

  const openTagDialog = async () => {
    try {
      const res = await fetch("/api/tags")
      if (res.ok) {
        const json = await res.json()
        setAvailableTags(json.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err)
    }
    setTagDialogOpen(true)
  }

  const openEditDialog = () => {
    if (friend) {
      setEditForm({
        customName: friend.custom_name || "",
        memo: friend.memo || "",
      })
    }
    setEditOpen(true)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AppLayout>
    )
  }

  if (!friend) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">友だちが見つかりません</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/friends")}>
            一覧に戻る
          </Button>
        </div>
      </AppLayout>
    )
  }

  const status = statusConfig[friend.status] || statusConfig.active
  const assignedTagIds = new Set((friend.tags || []).map((t) => t.id))
  const unassignedTags = availableTags.filter((t) => !assignedTagIds.has(t.id))

  return (
    <AppLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/friends")}>
          <ArrowLeft size={16} className="mr-1" />
          友だち一覧
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* プロフィールカード */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {friend.picture_url ? (
                  <img
                    src={friend.picture_url}
                    alt=""
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={24} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-lg">
                    {friend.custom_name || friend.display_name || "名前なし"}
                  </h2>
                  {friend.custom_name && friend.display_name && (
                    <p className="text-sm text-muted-foreground">
                      LINE: {friend.display_name}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={openEditDialog}>
                <Edit size={16} />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">ステータス:</span>
                <Badge className={status.className}>{status.label}</Badge>
                {/* CRM側からのブロック切替 */}
                {friend.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs ml-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={handleToggleBlock}
                    disabled={statusChanging}
                  >
                    {statusChanging ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    ブロック
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs ml-auto border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={handleToggleBlock}
                    disabled={statusChanging}
                  >
                    {statusChanging ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    ブロック解除
                  </Button>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">追加日:</span>
                <span className="text-sm ml-2">
                  {friend.first_added_at ? formatDate(friend.first_added_at) : "-"}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">最終反応:</span>
                <span className="text-sm ml-2">
                  {friend.last_interaction_at
                    ? formatRelativeTime(friend.last_interaction_at)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">User ID:</span>
                <button
                  type="button"
                  className="ml-2 inline-flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-1.5 py-0.5 transition-colors"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(friend.line_user_id)
                      // シンプルに alert で通知（v1）
                      alert(`User ID をコピーしました\n${friend.line_user_id}`)
                    } catch {
                      alert("コピーに失敗しました。ブラウザがクリップボードを許可していない可能性があります。")
                    }
                  }}
                  title={`クリックでコピー: ${friend.line_user_id}`}
                >
                  <span className="break-all">{friend.line_user_id}</span>
                </button>
              </div>
              {friend.memo && (
                <div>
                  <span className="text-sm text-muted-foreground">メモ:</span>
                  <p className="text-sm mt-1 bg-muted p-2 rounded">{friend.memo}</p>
                </div>
              )}
            </div>
          </Card>

          {/* タグ管理 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag size={16} />
                タグ
              </h3>
              <Button variant="outline" size="sm" onClick={openTagDialog}>
                <Plus size={14} className="mr-1" />
                追加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(friend.tags || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">タグなし</p>
              ) : (
                (friend.tags || []).map((tag) => (
                  <Badge
                    key={tag.id}
                    className="flex items-center gap-1"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* メッセージ送信 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Send size={16} />
              メッセージ送信
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="メッセージを入力..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                disabled={friend.status !== "active"}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sending || friend.status !== "active"}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
            {friend.status !== "active" && (
              <p className="text-xs text-muted-foreground mt-2">
                ブロック中またはフォロー解除済みの友だちにはメッセージを送信できません
              </p>
            )}
          </Card>

          {/* 参加履歴 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar size={16} />
              セミナー参加履歴
            </h3>
            {(friend.attendances || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">参加履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {(friend.attendances || []).map((att) => {
                  const attStatus =
                    attendanceStatusConfig[att.status] || attendanceStatusConfig.applied
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{att.seminar.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.seminar.date ? formatDate(att.seminar.date) : "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={attStatus.className}>{attStatus.label}</Badge>
                        {att.applied_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(att.applied_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* メッセージ履歴 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare size={16} />
              メッセージ履歴
            </h3>
            {(friend.message_logs || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">メッセージ履歴はありません</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(friend.message_logs || []).map((log) => {
                  const entry = formatHistoryEntry(log)

                  // system イベント (友だち追加・解除等) は中央に薄いバッジで表示
                  if (entry.kind === "system") {
                    return (
                      <div key={log.id} className="flex justify-center my-2">
                        <div className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                          <span className="font-medium">{entry.label}</span>
                          <span className="mx-1.5 text-gray-300">·</span>
                          <span>{entry.text}</span>
                          <span className="mx-1.5 text-gray-300">·</span>
                          <span>{formatRelativeTime(log.sent_at)}</span>
                        </div>
                      </div>
                    )
                  }

                  // outgoing / incoming は従来通りバブル形式
                  const isOutgoing = entry.kind === "outgoing"
                  return (
                    <div
                      key={log.id}
                      className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          isOutgoing
                            ? "bg-[#06C755] text-white"
                            : "bg-muted"
                        }`}
                      >
                        {/* イベント種別バッジ (送信/受信以外のときに表示) */}
                        {entry.label !== "送信" && entry.label !== "メッセージ" && (
                          <div
                            className={`inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1 ${
                              isOutgoing
                                ? "bg-white/20 text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {entry.label}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{entry.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOutgoing
                              ? "text-white/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatRelativeTime(log.sent_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>友だち情報の編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>表示名</Label>
              <Input
                value={editForm.customName}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, customName: e.target.value }))
                }
                placeholder="カスタム表示名"
              />
            </div>
            <div>
              <Label>メモ</Label>
              <Textarea
                value={editForm.memo}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, memo: e.target.value }))
                }
                placeholder="メモを入力..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* タグ追加ダイアログ */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグを追加</DialogTitle>
          </DialogHeader>
          {unassignedTags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              追加可能なタグがありません
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 py-4">
              {unassignedTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="px-3 py-1.5 rounded-full text-sm text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: tag.color }}
                >
                  + {tag.name}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
