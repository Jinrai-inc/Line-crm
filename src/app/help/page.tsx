"use client"

import { useState, useMemo } from "react"
import { useAccentColor } from "@/hooks/use-accent-color"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Mail,
  BookOpen,
  MessageSquare,
  Users,
  CalendarDays,
  Send,
  ClipboardList,
  Tag,
  Settings,
  CreditCard,
  HeartHandshake,
  Timer,
  Zap,
} from "lucide-react"

interface ManualSection {
  title: string
  icon: React.ReactNode
  color: string
  items: { question: string; answer: string }[]
}

const manualSections: ManualSection[] = [
  {
    title: "はじめに（初期設定）",
    icon: <Settings className="h-5 w-5" />,
    color: "text-gray-600 bg-gray-100",
    items: [
      {
        question: "LINE connect CRMとは何ですか？",
        answer:
          "LINE connect CRMは、LINE公式アカウントと連携して友だち（顧客）を管理するためのシステムです。セミナー管理、メッセージ配信、アンケート、決済連携など、ビジネスに必要な機能を備えています。",
      },
      {
        question: "初期設定の手順を教えてください。",
        answer:
          "1. アカウント登録後、設定ページからLINE公式アカウントとの連携を行います\n2. 設定ページに表示されるWebhook URLをLINE Developersコンソールに登録します\n3. チャネルアクセストークンとチャネルシークレットを入力して連携完了です\n4. 必要に応じてStripe決済やGoogleカレンダーの連携も設定できます",
      },
      {
        question: "Webhook URLの設定方法は？",
        answer:
          "1. 設定ページの上部に表示されるLINE Webhook URLをコピーします\n2. LINE Developersコンソール（developers.line.biz）を開きます\n3. 対象のチャネル → Messaging API → Webhook URL に貼り付けます\n4. 「Webhookの利用」をONにします\n5. 「検証」ボタンで接続テストを行います",
      },
    ],
  },
  {
    title: "LINE連携設定",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "text-green-600 bg-green-100",
    items: [
      {
        question: "LINE公式アカウントとの連携方法は？",
        answer:
          "設定 → LINE連携 から、LINE Developersコンソールで取得したチャネルアクセストークンとチャネルシークレットを入力してください。Webhook URLは設定ページに自動表示されます。",
      },
      {
        question: "Webhookが正しく動作しているか確認するには？",
        answer:
          "LINE Developersコンソールで「検証」ボタンを押すことで接続テストが可能です。成功すると「成功しました」と表示されます。友だち追加時に自動でCRMに登録されれば正常動作しています。",
      },
      {
        question: "友だち追加時に自動でCRMに登録されますか？",
        answer:
          "はい。LINE連携が正しく設定されていれば、新しい友だちが追加されると自動的にCRMに登録されます。表示名やプロフィール画像も取得されます。",
      },
    ],
  },
  {
    title: "挨拶メッセージ設定",
    icon: <Zap className="h-5 w-5" />,
    color: "text-pink-600 bg-pink-100",
    items: [
      {
        question: "挨拶メッセージとは？",
        answer:
          "友だち追加された時に自動で送信されるメッセージです。設定 → 挨拶メッセージ から内容をカスタマイズできます。",
      },
      {
        question: "期間指定メッセージとは？",
        answer:
          "特定の期間内に友だち追加された人に、通常の挨拶メッセージの代わりに送信される特別なメッセージです。キャンペーンやイベント告知に活用できます。\n\n設定方法：\n1. 設定 → 挨拶メッセージ → 期間指定メッセージを「有効」にします\n2. 開始日時と終了日時を設定します\n3. 期間中に送信したいメッセージを入力します",
      },
      {
        question: "挨拶メッセージの後にアンケートを自動送信するには？",
        answer:
          "各メッセージカード内の「メッセージ後に送信するアンケート」セレクターから、送信したいアンケートを選択してください。\n\n・通常の挨拶メッセージ → 通常時のアンケートを設定\n・期間指定メッセージ → 期間中のみ送信されるアンケートを個別に設定\n\nアンケートは事前に「アンケート」ページで作成しておく必要があります。",
      },
      {
        question: "フォローアップメッセージとは？",
        answer:
          "挨拶メッセージの後に追加で自動送信されるテキストメッセージです。複数追加でき、上から順番に送信されます。\n\n設定方法：\n1. 設定 → 挨拶メッセージ → フォローアップ自動配信\n2. 「メッセージを追加」ボタンで追加\n3. 各メッセージの内容を入力（{name}で相手の名前を自動挿入可能）",
      },
      {
        question: "{name}タグの使い方は？",
        answer:
          "メッセージ内に {name} と入力すると、送信時に相手のLINE表示名に自動で置き換わります。\n\n例：「{name}さん、友だち追加ありがとうございます！」\n→ 「田中太郎さん、友だち追加ありがとうございます！」\n\n各メッセージ入力欄の「名前挿入」ボタンを押すと、カーソル位置に自動挿入されます。\n\n使える場所：挨拶メッセージ、配信メッセージ、アンケート自動返信、ステップ配信、フォローアップメッセージ",
      },
    ],
  },
  {
    title: "ステップ配信",
    icon: <Timer className="h-5 w-5" />,
    color: "text-indigo-600 bg-indigo-100",
    items: [
      {
        question: "ステップ配信とは？",
        answer:
          "友だち追加後に、設定した時間差で自動的にメッセージを順番に配信する機能です。例えば「追加1日後にお礼」「3日後にセミナー案内」「7日後にフォローアップ」といった流れを自動化できます。",
      },
      {
        question: "ステップ配信の設定方法は？",
        answer:
          "1. 設定 → ステップ配信 を開きます\n2. 「全体の有効/無効」をONにします\n3. 「ステップを追加」ボタンでメッセージを追加します\n4. 各ステップに遅延時間（日数・時間）とメッセージ内容を設定します\n5. 「保存」ボタンで設定を保存します\n\n{name}タグも使用可能です。",
      },
      {
        question: "ステップ配信の遅延時間はどう計算されますか？",
        answer:
          "友だち追加された時点から、設定した遅延時間（日数 + 時間）が経過した時点でメッセージが送信されます。処理は5分間隔で実行されるため、最大5分程度の誤差が生じる場合があります。",
      },
      {
        question: "ステップ配信を途中で止めるには？",
        answer:
          "設定 → ステップ配信 で「全体の有効/無効」をOFFにすると、新規の友だちに対するステップ配信が停止されます。既にキューに入っている送信予定は引き続き送信されます。",
      },
    ],
  },
  {
    title: "友だち管理",
    icon: <Users className="h-5 w-5" />,
    color: "text-blue-600 bg-blue-100",
    items: [
      {
        question: "友だちにタグを付けるには？",
        answer:
          "友だち一覧から対象の友だちを選択し、詳細画面でタグの追加・削除が可能です。複数のタグを同時に設定することもできます。",
      },
      {
        question: "友だちの検索・フィルタリング方法は？",
        answer:
          "友だち一覧ページの検索バーから、表示名・カスタム名・メールアドレス・電話番号・メモの内容で検索できます。タグやステータスでのフィルタリングも可能です。",
      },
      {
        question: "友だちのステータスの種類は？",
        answer:
          "「フォロー中」「ブロック」「未フォロー」の3種類があります。LINEでブロックされた場合は自動的にステータスが更新されます。",
      },
    ],
  },
  {
    title: "セミナー管理",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "text-orange-600 bg-orange-100",
    items: [
      {
        question: "新しいセミナーを作成するには？",
        answer:
          "セミナー管理ページの「新規作成」ボタンから、セミナー名、日時、会場（ZoomURLなど）、定員、タグなどの情報を入力して作成できます。",
      },
      {
        question: "セミナーにタグを設定するには？",
        answer:
          "セミナー作成・編集画面でタグを選択できます。参加者の属性管理やフィルタリングに活用できます。",
      },
      {
        question: "LINEからセミナーに申し込めるようにするには？",
        answer:
          "配信メッセージやアンケートの自動返信にセミナー案内を紐づけることで、友だちがLINE上からセミナーに直接申し込めるようになります。\n\nアンケートの各選択肢に「セミナー案内」で対象セミナーを選択すると、回答後にセミナー申込ボタンが送信されます。",
      },
      {
        question: "セミナーの参加者を管理するには？",
        answer:
          "セミナー詳細ページから参加者の追加・削除、出欠状況の管理ができます。",
      },
    ],
  },
  {
    title: "アンケート",
    icon: <ClipboardList className="h-5 w-5" />,
    color: "text-purple-600 bg-purple-100",
    items: [
      {
        question: "アンケートの作成方法は？",
        answer:
          "1. アンケートページの「新規作成」をクリック\n2. タイトルを入力\n3. 質問と選択肢を設定\n4. 必要に応じて各選択肢に自動返信メッセージ・タグ・特典を設定\n5. 「保存」ボタンで保存します",
      },
      {
        question: "アンケートの条件分岐とは？",
        answer:
          "質問が2つ以上ある場合、選択肢ごとに次に表示する質問を指定できます。\n\n例：質問1「性別」→「男性」を選ぶと質問3へスキップ、「女性」を選ぶと質問2へ\n\n設定方法：各選択肢の「次の質問（分岐）」セレクターで遷移先を指定します。「アンケート終了」を選ぶとそこで終了します。",
      },
      {
        question: "選択肢ごとに自動返信を変えるには？",
        answer:
          "各選択肢の「自動返信メッセージ」欄にメッセージを入力します。{name}タグも使用可能です。「名前挿入」ボタンでカーソル位置に挿入できます。\n\nさらに「セミナー案内」で公開中のセミナーを選択すると、自動返信の後にセミナー申込ボタンが送信されます。",
      },
      {
        question: "アンケートを友だち追加時に自動送信するには？",
        answer:
          "設定 → 挨拶メッセージ の各メッセージカード内にある「メッセージ後に送信するアンケート」から、自動送信したいアンケートを選択してください。",
      },
    ],
  },
  {
    title: "配信管理",
    icon: <Send className="h-5 w-5" />,
    color: "text-teal-600 bg-teal-100",
    items: [
      {
        question: "一斉配信の方法は？",
        answer:
          "1. 配信管理ページの「新規配信」タブを開きます\n2. 配信タイトルとメッセージを作成します（{name}タグ使用可能）\n3. 送信先を選択（全員/タグ指定/セミナー参加者）\n4. 必要に応じてアンケートやセミナー案内を添付\n5. 「送信する」ボタンで配信します",
      },
      {
        question: "メッセージに画像やPDFを添付するには？",
        answer:
          "メッセージ種別で「画像」「動画」「PDF」を選択するか、テキストメッセージの下にある「ファイル添付」からドラッグ＆ドロップでアップロードできます。",
      },
      {
        question: "配信でセミナー案内を送るには？",
        answer:
          "配信作成画面で「セミナー案内を添付」をONにし、送信したいセミナーを選択します。メッセージとセミナー申込ボタンが一緒に送信されます。",
      },
      {
        question: "配信履歴の確認方法は？",
        answer:
          "配信管理ページの「配信履歴」タブから、過去の配信の送信件数・失敗件数・ステータスを確認できます。",
      },
    ],
  },
  {
    title: "タグ管理",
    icon: <Tag className="h-5 w-5" />,
    color: "text-yellow-600 bg-yellow-100",
    items: [
      {
        question: "タグの作成方法は？",
        answer:
          "タグ管理ページの「タグを追加」ボタンからタグ名と色を設定して作成できます。",
      },
      {
        question: "自動タグ付与とは？",
        answer:
          "設定 → 自動タグ付与 から、友だち追加から一定時間以内に登録された友だちに自動でタグを付与する設定ができます。キャンペーンの計測などに活用できます。",
      },
      {
        question: "アンケートでタグを自動付与するには？",
        answer:
          "アンケートの各選択肢に「自動タグ」を設定すると、その選択肢を選んだ友だちに自動でタグが付与されます。",
      },
    ],
  },
  {
    title: "決済・Stripe連携",
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-violet-600 bg-violet-100",
    items: [
      {
        question: "Stripe決済の設定方法は？",
        answer:
          "1. 設定 → Stripe決済連携 を開きます\n2. StripeのAPIキー（シークレットキー）を入力します\n3. 設定ページに表示されるStripe Webhook URLをStripeダッシュボードに登録します\n4. Webhookシークレットを入力して連携完了です",
      },
      {
        question: "決済リンクはどこで作成しますか？",
        answer:
          "決済リンクはStripeダッシュボードで作成します。WordPressを使用している場合は、管理画面の「ツール → ストライプ決済」からも作成できます。作成した決済URLをメッセージに含めて送信できます。",
      },
    ],
  },
  {
    title: "婚活スクール",
    icon: <HeartHandshake className="h-5 w-5" />,
    color: "text-rose-600 bg-rose-100",
    items: [
      {
        question: "会員を登録するには？",
        answer:
          "会員管理ページの「新規登録」から、会員の基本情報（氏名、年齢、職業など）を入力して登録できます。友だちとの紐付けも可能です。",
      },
      {
        question: "お見合いの管理方法は？",
        answer:
          "お見合い管理ページから、マッチング候補の選定、日程調整、結果の記録ができます。成立率の統計も確認できます。",
      },
    ],
  },
]

export default function HelpPage() {
  const accentColor = useAccentColor()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"manual" | "faq">("manual")

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return manualSections
    const query = searchQuery.toLowerCase()
    return manualSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [searchQuery])

  return (
    <AppLayout>
      <PageHeader
        title="マニュアル・ヘルプ"
        description="操作マニュアルとよくある質問"
      />

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "manual"
              ? "text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          style={activeTab === "manual" ? { backgroundColor: accentColor } : undefined}
        >
          <BookOpen className="h-4 w-4" />
          操作マニュアル
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "faq"
              ? "text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          style={activeTab === "faq" ? { backgroundColor: accentColor } : undefined}
        >
          <Search className="h-4 w-4" />
          よくある質問
        </button>
      </div>

      {/* 検索 */}
      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="キーワードで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-1">検索結果が見つかりません</p>
          <p className="text-sm">別のキーワードで検索してみてください。</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* 目次（マニュアルタブ時のみ） */}
          {activeTab === "manual" && !searchQuery && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                目次
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {manualSections.map((section) => (
                  <a
                    key={section.title}
                    href={`#section-${section.title}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    <span className={`shrink-0 p-1 rounded ${section.color}`}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* セクション一覧 */}
          {filteredSections.map((section) => (
            <div key={section.title} id={`section-${section.title}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`p-1.5 rounded-lg ${section.color}`}>
                  {section.icon}
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  {section.title}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {section.items.length}件
                </Badge>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Accordion type="single" collapsible>
                  {section.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${section.title}-${index}`}
                      className="px-4"
                    >
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* サポート連絡先 */}
      <div className="mt-12 max-w-3xl bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
        <Mail className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">
          お探しの回答が見つかりませんか？
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          サポートチームが対応いたします。お気軽にお問い合わせください。
        </p>
        <a
          href="mailto:support@example.com"
          className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-colors"
          style={{ backgroundColor: accentColor }}
        >
          <Mail className="w-4 h-4" />
          サポートに連絡
        </a>
      </div>
    </AppLayout>
  )
}
