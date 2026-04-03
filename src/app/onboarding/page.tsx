"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Check,
  Loader2,
  ExternalLink,
  CheckCircle,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { WizardLayout } from "@/components/onboarding/wizard-layout"
import { MockBrowser } from "@/components/onboarding/mock-browser"
import { InstructionStep } from "@/components/onboarding/instruction-step"
import { ClickPath } from "@/components/onboarding/click-path"
import { Callout } from "@/components/onboarding/callout"

const STEP_LABELS = ["ようこそ", "LINE Developers", "応答設定", "CRM接続", "完了"]

type TestStatus = "idle" | "loading" | "success" | "error"

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1 state
  const [devChecklist, setDevChecklist] = useState({
    channelId: false,
    channelSecret: false,
    channelAccessToken: false,
  })

  // Step 2 state
  const [responseChecklist, setResponseChecklist] = useState({
    botMode: false,
    greetingOff: false,
    autoReplyOff: false,
    webhookOn: false,
  })

  // Step 3 state
  const [channelId, setChannelId] = useState("")
  const [channelSecret, setChannelSecret] = useState("")
  const [channelAccessToken, setChannelAccessToken] = useState("")
  const [testStatus, setTestStatus] = useState<TestStatus>("idle")
  const [testMessage, setTestMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/webhook/line`

  const allDevChecked = devChecklist.channelId && devChecklist.channelSecret && devChecklist.channelAccessToken
  const allResponseChecked = responseChecklist.botMode && responseChecklist.greetingOff && responseChecklist.autoReplyOff && responseChecklist.webhookOn
  const allFieldsFilled = channelId.trim() !== "" && channelSecret.trim() !== "" && channelAccessToken.trim() !== ""
  const canComplete = allFieldsFilled && testStatus === "success"

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTestConnection = async () => {
    setTestStatus("loading")
    setTestMessage("")
    try {
      const res = await fetch("/api/settings/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, channelSecret, channelAccessToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestStatus("success")
        setTestMessage("LINE APIとの接続に成功しました。")
      } else {
        setTestStatus("error")
        setTestMessage(data.error || "接続テストに失敗しました。認証情報を確認してください。")
      }
    } catch {
      setTestStatus("error")
      setTestMessage("接続テストに失敗しました。ネットワークを確認してください。")
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, channelSecret, channelAccessToken }),
      })
      setCurrentStep(4)
    } catch {
      // Proceed even if save fails - user can reconfigure later
      setCurrentStep(4)
    } finally {
      setSaving(false)
    }
  }

  const getNextDisabled = () => {
    switch (currentStep) {
      case 1:
        return !allDevChecked
      case 2:
        return !allResponseChecked
      default:
        return false
    }
  }

  const getNextLabel = () => {
    switch (currentStep) {
      case 0:
        return "始める"
      case 3:
        return "セットアップを完了する"
      default:
        return "次へ"
    }
  }

  const handleNext = () => {
    if (currentStep === 3) {
      handleComplete()
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  // ─── Step 0: Welcome ───────────────────────────────────────
  const renderStep0 = () => (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Sparkles className="h-8 w-8 text-green-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        LINE connect CRMへようこそ！
      </h1>
      <p className="mb-8 text-gray-500">
        かんたん3ステップでLINE公式アカウントとCRMを連携しましょう。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mb-1 font-bold text-gray-900">LINE連携</h3>
          <p className="text-sm text-gray-500">
            LINE公式アカウントと接続
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mb-1 font-bold text-gray-900">友だち管理</h3>
          <p className="text-sm text-gray-500">
            CRMで一元管理
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mb-1 font-bold text-gray-900">配信・分析</h3>
          <p className="text-sm text-gray-500">
            セグメント配信と分析
          </p>
        </div>
      </div>
    </div>
  )

  // ─── Step 1: LINE Developers設定ガイド ──────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-gray-900">LINE Developers設定ガイド</h2>
        <p className="text-sm text-gray-500">
          LINE Developersコンソールで必要な情報を取得します。
        </p>
      </div>

      <MockBrowser url="https://developers.line.biz/console" title="LINE Developers Console">
        <div className="space-y-6">
          <InstructionStep step={1} title="LINE Developersにログイン">
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              LINE Developersを開く
              <ExternalLink className="h-4 w-4" />
            </a>
          </InstructionStep>

          <InstructionStep step={2} title="プロバイダーを作成">
            <Callout variant="info">
              既にプロバイダーがある場合はこのステップをスキップできます。
            </Callout>
          </InstructionStep>

          <InstructionStep step={3} title="Messaging APIチャネルを作成">
            <ClickPath steps={["プロバイダー選択", "新規チャネル", "Messaging API"]} />
          </InstructionStep>

          <InstructionStep step={4} title="チャネルアクセストークンを発行">
            <ClickPath steps={["Messaging API設定", "チャネルアクセストークン", "発行"]} />
            <div className="mt-2">
              <Callout variant="warning" title="注意">
                チャネルアクセストークンは発行時に一度しか表示されません。必ずコピーして安全な場所に保存してください。
              </Callout>
            </div>
          </InstructionStep>

          <InstructionStep step={5} title="チャネルID・チャネルシークレットをメモ">
            <p className="text-sm text-gray-600">
              「チャネル基本設定」タブから以下の3つの情報を取得してください。
            </p>
          </InstructionStep>
        </div>
      </MockBrowser>

      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-4 font-bold text-gray-900">取得した情報の確認</h3>
        <p className="mb-4 text-sm text-gray-500">
          以下の3つの情報を取得しましたか？すべてチェックしてから次へ進んでください。
        </p>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={devChecklist.channelId}
              onChange={(e) => setDevChecklist((prev) => ({ ...prev, channelId: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">チャネルID を取得した</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={devChecklist.channelSecret}
              onChange={(e) => setDevChecklist((prev) => ({ ...prev, channelSecret: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">チャネルシークレット を取得した</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={devChecklist.channelAccessToken}
              onChange={(e) => setDevChecklist((prev) => ({ ...prev, channelAccessToken: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">チャネルアクセストークン を取得した</span>
          </label>
        </div>
      </div>
    </div>
  )

  // ─── Step 2: LINE公式アカウント応答設定 ─────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-gray-900">LINE公式アカウント応答設定</h2>
        <p className="text-sm text-gray-500">
          LINE Official Account Managerで以下の設定を変更してください。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 応答モード → Bot */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">応答モード</h3>
            <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">Bot</span>
          </div>
          <p className="mb-3 text-sm text-gray-500">
            Bot に設定してください。
          </p>
          <p className="mb-3 text-xs text-gray-400">
            なぜ必要か：Botモードにすることで、Webhook経由でメッセージを受信できるようになります。
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={responseChecklist.botMode}
              onChange={(e) => setResponseChecklist((prev) => ({ ...prev, botMode: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">設定済み</span>
          </label>
        </div>

        {/* あいさつメッセージ → OFF */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">あいさつメッセージ</h3>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-700">OFF</span>
          </div>
          <p className="mb-3 text-sm text-gray-500">
            オフに設定してください。
          </p>
          <p className="mb-3 text-xs text-gray-400">
            なぜ必要か：CRM側であいさつメッセージを制御するため、LINE側のメッセージをオフにします。
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={responseChecklist.greetingOff}
              onChange={(e) => setResponseChecklist((prev) => ({ ...prev, greetingOff: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">設定済み</span>
          </label>
        </div>

        {/* 応答メッセージ → OFF */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">応答メッセージ</h3>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-700">OFF</span>
          </div>
          <p className="mb-3 text-sm text-gray-500">
            オフに設定してください。
          </p>
          <p className="mb-3 text-xs text-gray-400">
            なぜ必要か：自動応答が有効だとCRMからの返信とLINEの自動応答が二重に送信されます。
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={responseChecklist.autoReplyOff}
              onChange={(e) => setResponseChecklist((prev) => ({ ...prev, autoReplyOff: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">設定済み</span>
          </label>
        </div>

        {/* Webhook → ON */}
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Webhook</h3>
            <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">ON</span>
          </div>
          <p className="mb-3 text-sm text-gray-500">
            オンに設定してください。
          </p>
          <p className="mb-3 text-xs text-gray-400">
            なぜ必要か：WebhookをオンにすることでLINEからのイベント（メッセージ・友だち追加等）をCRMが受信できます。
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={responseChecklist.webhookOn}
              onChange={(e) => setResponseChecklist((prev) => ({ ...prev, webhookOn: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">設定済み</span>
          </label>
        </div>
      </div>

      <Callout variant="warning" title="設定ミスに注意">
        応答設定を間違えるとメッセージが二重に送信されることがあります。すべての項目を正しく設定してください。
      </Callout>
    </div>
  )

  // ─── Step 3: CRM接続 ───────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-gray-900">CRM接続</h2>
        <p className="text-sm text-gray-500">
          LINE Developersで取得した情報を入力して、接続テストを行います。
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="channelId" className="mb-1 block text-sm font-medium text-gray-700">
            チャネルID
          </label>
          <input
            id="channelId"
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="例: 1234567890"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="channelSecret" className="mb-1 block text-sm font-medium text-gray-700">
            チャネルシークレット
          </label>
          <input
            id="channelSecret"
            type="password"
            value={channelSecret}
            onChange={(e) => setChannelSecret(e.target.value)}
            placeholder="チャネルシークレットを入力"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="channelAccessToken" className="mb-1 block text-sm font-medium text-gray-700">
            チャネルアクセストークン
          </label>
          <input
            id="channelAccessToken"
            type="password"
            value={channelAccessToken}
            onChange={(e) => setChannelAccessToken(e.target.value)}
            placeholder="チャネルアクセストークンを入力"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-2 font-bold text-gray-900">Webhook URL</h3>
        <p className="mb-3 text-sm text-gray-500">
          以下のURLをLINE DevelopersのWebhook URLに貼り付けてください。
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-800 break-all">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="shrink-0 rounded-lg border border-gray-300 bg-white p-2.5 text-gray-600 transition-colors hover:bg-gray-50"
            title="コピー"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-500">
            LINE Developersの「Messaging API設定」タブ →「Webhook URL」にこのURLを貼り付け →「検証」ボタンで確認してください。
          </p>
        </div>
      </div>

      {/* Connection Test */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-2 font-bold text-gray-900">接続テスト</h3>
        <p className="mb-3 text-sm text-gray-500">
          入力した認証情報でLINE APIに接続できるかテストします。
        </p>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!allFieldsFilled || testStatus === "loading"}
          className="flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testStatus === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              テスト中...
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              接続テスト
            </>
          )}
        </button>

        {testStatus === "success" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
            {testMessage}
          </div>
        )}
        {testStatus === "error" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <Settings className="h-5 w-5 shrink-0 text-red-500" />
            {testMessage}
          </div>
        )}
      </div>
    </div>
  )

  // ─── Step 4: Complete ──────────────────────────────────────
  const renderStep4 = () => (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        セットアップが完了しました！
      </h1>
      <p className="mb-8 text-gray-500">
        LINE connect CRMを使い始める準備ができました。
      </p>

      <div className="mx-auto max-w-md rounded-xl border border-gray-200 p-5 text-left">
        <h3 className="mb-4 font-bold text-gray-900">次にやること</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">1</span>
            LINEで自分のQRコードを読み取って友だち追加テスト
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">2</span>
            「セミナー一覧」とLINEで送ってみる
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">3</span>
            CRMの「セミナー管理」から最初のセミナーを作成する
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">4</span>
            CRMの「友だち管理」にデータが入っているか確認する
          </li>
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/help")}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          使い方マニュアルを見る
          <ExternalLink className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
        >
          ダッシュボードへ
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep0()
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={5}
      stepLabels={STEP_LABELS}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={currentStep === 3 && saving ? "保存中..." : getNextLabel()}
      nextDisabled={currentStep === 3 ? !canComplete || saving : getNextDisabled()}
      showBack={currentStep > 0 && currentStep < 4}
    >
      {renderCurrentStep()}
    </WizardLayout>
  )
}
