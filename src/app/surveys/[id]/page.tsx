"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Loader2,
  ClipboardList,
  Users,
  BarChart3,
  ArrowLeft,
  User,
  Gift,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"

interface SurveyData {
  id: string
  title: string
  questions: string | Question[]
  status: string
}

interface Choice {
  text: string
  tagName?: string
  rewardMessage?: string
  rewardUrl?: string
  file?: { url: string; fileName?: string; mimeType?: string } | null
}

interface Question {
  label: string
  choices: Choice[]
  hasReward?: boolean
}

interface ResponseData {
  id: string
  friend_id: string | null
  line_user_id: string
  question_index: number
  choice_index: number
  question_label: string
  choice_text: string
  tag_name: string | null
  created_at: string
  friend: { display_name: string; picture_url: string | null } | null
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const accentColor = useAccentColor()
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"summary" | "individual">("summary")

  // 特典再送ダイアログ
  const [resendTarget, setResendTarget] = useState<{
    questionIndex: number
    choiceIndex: number
    question: Question
    choice: Choice
    targetCount: number
  } | null>(null)
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<{
    sentCount: number
    failedCount: number
  } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${id}`),
        fetch(`/api/surveys/${id}/responses`),
      ])
      if (surveyRes.ok) {
        const sj = await surveyRes.json()
        setSurvey(sj.data)
      }
      if (responsesRes.ok) {
        const rj = await responsesRes.json()
        setResponses(rj.data || [])
      }
    } catch {
      console.error("データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const questions: Question[] = survey
    ? typeof survey.questions === "string"
      ? JSON.parse(survey.questions)
      : survey.questions || []
    : []

  // 質問ごとの集計
  const questionStats = questions.map((q, qIdx) => {
    const qResponses = responses.filter((r) => r.question_index === qIdx)
    const total = qResponses.length
    const choiceCounts = q.choices.map((c, cIdx) => {
      const count = qResponses.filter((r) => r.choice_index === cIdx).length
      return { text: c.text, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }
    })
    return { label: q.label, total, choiceCounts }
  })

  // ユニーク回答者数
  const uniqueRespondents = new Set(responses.map((r) => r.line_user_id)).size

  // 選択肢に特典が設定されているか
  function choiceHasReward(choice: Choice): boolean {
    return !!(choice.rewardMessage || choice.rewardUrl || choice.file)
  }

  // 特定の選択肢に回答したユニークな line_user_id 数
  function countRecipients(qIdx: number, cIdx: number): number {
    const ids = new Set<string>()
    for (const r of responses) {
      if (r.question_index === qIdx && r.choice_index === cIdx) {
        ids.add(r.line_user_id)
      }
    }
    return ids.size
  }

  // 再送ダイアログを開く
  function openResendDialog(qIdx: number, cIdx: number) {
    const question = questions[qIdx]
    const choice = question?.choices?.[cIdx]
    if (!question || !choice) return
    setResendResult(null)
    setResendTarget({
      questionIndex: qIdx,
      choiceIndex: cIdx,
      question,
      choice,
      targetCount: countRecipients(qIdx, cIdx),
    })
  }

  // 実行
  async function handleResend() {
    if (!resendTarget) return
    setResending(true)
    setResendResult(null)
    try {
      const res = await fetch(`/api/surveys/${id}/resend-rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: [
            {
              questionIndex: resendTarget.questionIndex,
              choiceIndex: resendTarget.choiceIndex,
            },
          ],
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setResendResult({
          sentCount: json.sentCount || 0,
          failedCount: json.failedCount || 0,
        })
        setToast({
          type: "success",
          message: `${json.sentCount || 0}件に特典を再送しました${
            json.failedCount ? `（${json.failedCount}件失敗）` : ""
          }`,
        })
      } else {
        const json = await res.json().catch(() => ({}))
        setToast({
          type: "error",
          message: json.error || "再送に失敗しました",
        })
      }
    } catch {
      setToast({
        type: "error",
        message: "再送に失敗しました。ネットワーク接続を確認してください。",
      })
    } finally {
      setResending(false)
    }
  }

  // 個別回答（ユーザーごとにグループ化）
  const responsesByUser = responses.reduce((acc, r) => {
    const key = r.line_user_id
    if (!acc[key]) acc[key] = { friend: r.friend, responses: [] }
    acc[key].responses.push(r)
    return acc
  }, {} as Record<string, { friend: ResponseData["friend"]; responses: ResponseData[] }>)

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="アンケート結果" description="" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  if (!survey) {
    return (
      <AppLayout>
        <PageHeader title="アンケート結果" description="" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-500">アンケートが見つかりません</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/surveys"><ArrowLeft className="h-4 w-4 mr-2" />一覧に戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title={`${survey.title} の結果`}
        description="アンケート回答の集計と詳細"
        action={
          <Button variant="outline" asChild>
            <Link href="/surveys"><ArrowLeft className="h-4 w-4 mr-2" />一覧に戻る</Link>
          </Button>
        }
      />

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Users size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueRespondents}</p>
              <p className="text-xs text-gray-500">回答者数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <BarChart3 size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{responses.length}</p>
              <p className="text-xs text-gray-500">回答数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <ClipboardList size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-xs text-gray-500">質問数</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 表示切替 */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={viewMode === "summary" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("summary")}
          style={viewMode === "summary" ? { backgroundColor: accentColor } : undefined}
          className={viewMode === "summary" ? "text-white" : ""}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          集計
        </Button>
        <Button
          variant={viewMode === "individual" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("individual")}
          style={viewMode === "individual" ? { backgroundColor: accentColor } : undefined}
          className={viewMode === "individual" ? "text-white" : ""}
        >
          <Users className="h-4 w-4 mr-1" />
          個別回答
        </Button>
      </div>

      {/* 集計ビュー */}
      {viewMode === "summary" && (
        <div className="space-y-4">
          {questionStats.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">まだ回答がありません</p>
              </CardContent>
            </Card>
          ) : (
            questionStats.map((q, qIdx) => {
              const rawChoices = questions[qIdx]?.choices || []
              return (
                <Card key={qIdx}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Q{qIdx + 1}</Badge>
                        {q.label}
                      </h3>
                      <span className="text-xs text-gray-400">{q.total}件の回答</span>
                    </div>

                    <div className="space-y-2">
                      {q.choiceCounts.map((c, cIdx) => {
                        const rawChoice = rawChoices[cIdx]
                        const hasReward = rawChoice ? choiceHasReward(rawChoice) : false
                        return (
                          <div key={cIdx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm gap-2">
                              <span className="flex items-center gap-1.5">
                                {c.text}
                                {hasReward && (
                                  <Gift className="h-3 w-3 text-[#06C755]" />
                                )}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-gray-500 text-xs">
                                  {c.count}件 ({c.percentage}%)
                                </span>
                                {hasReward && c.count > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => openResendDialog(qIdx, cIdx)}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    特典を再送
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full flex items-center pl-2 text-xs text-white font-medium transition-all duration-500"
                                style={{
                                  width: `${Math.max(c.percentage, c.count > 0 ? 8 : 0)}%`,
                                  backgroundColor: accentColor,
                                }}
                              >
                                {c.percentage > 15 ? `${c.percentage}%` : ""}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* 特典再送ダイアログ */}
      <Dialog
        open={!!resendTarget}
        onOpenChange={(open) => {
          if (!open && !resending) {
            setResendTarget(null)
            setResendResult(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#06C755]" />
              特典を再送
            </DialogTitle>
          </DialogHeader>

          {resendTarget && !resendResult && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Q{resendTarget.questionIndex + 1}
                  </Badge>
                  <p className="text-sm font-medium truncate">
                    {resendTarget.question.label}
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-gray-500">回答:</span>
                  <span className="text-sm font-medium" style={{ color: accentColor }}>
                    {resendTarget.choice.text}
                  </span>
                </div>
              </div>

              {(resendTarget.choice.rewardMessage || resendTarget.choice.rewardUrl || resendTarget.choice.file) && (
                <div className="p-3 border rounded-lg space-y-1.5 bg-[#06C755]/5 border-[#06C755]/30">
                  <p className="text-xs font-semibold text-[#06C755]">🎁 送信される特典</p>
                  {resendTarget.choice.rewardMessage && (
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">
                      {resendTarget.choice.rewardMessage}
                    </p>
                  )}
                  {resendTarget.choice.rewardUrl && (
                    <p className="text-xs text-gray-500 truncate">
                      URL: {resendTarget.choice.rewardUrl}
                    </p>
                  )}
                  {resendTarget.choice.file?.url && (
                    <p className="text-xs text-gray-500 truncate">
                      添付: {resendTarget.choice.file.fileName || resendTarget.choice.file.url}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-900">
                  この選択肢に回答した
                  <span className="font-bold mx-1">{resendTarget.targetCount}</span>
                  人に特典を再送します
                </p>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                ※ 既に特典を受け取った人にも再送されます。大量送信時はVercelのタイムアウト（最大5分）内に完了するよう設計されています。
              </p>
            </div>
          )}

          {resendResult && (
            <div className="py-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-[#06C755]" />
              <p className="font-medium">
                {resendResult.sentCount}件に送信しました
              </p>
              {resendResult.failedCount > 0 && (
                <p className="text-sm text-red-500 mt-1">
                  {resendResult.failedCount}件失敗
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {resendResult ? (
              <Button
                onClick={() => {
                  setResendTarget(null)
                  setResendResult(null)
                }}
              >
                閉じる
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={resending}
                  onClick={() => setResendTarget(null)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleResend}
                  disabled={resending || !resendTarget || resendTarget.targetCount === 0}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90"
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  再送する
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* トースト */}
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

      {/* 個別回答ビュー */}
      {viewMode === "individual" && (
        <div className="space-y-3">
          {Object.keys(responsesByUser).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">まだ回答がありません</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(responsesByUser).map(([lineUserId, userData]) => (
              <Card key={lineUserId}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {userData.friend?.picture_url ? (
                      <img
                        src={userData.friend.picture_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={16} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {userData.friend?.display_name || "LINE User"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {userData.responses[0]?.created_at
                          ? new Date(userData.responses[0].created_at).toLocaleString("ja-JP")
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {userData.responses
                      .sort((a, b) => a.question_index - b.question_index)
                      .map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] shrink-0">Q{r.question_index + 1}</Badge>
                          <span className="text-gray-500 truncate">{r.question_label}</span>
                          <span className="font-medium ml-auto shrink-0" style={{ color: accentColor }}>
                            {r.choice_text}
                          </span>
                          {r.tag_name && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-transparent shrink-0">
                              {r.tag_name}
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </AppLayout>
  )
}
