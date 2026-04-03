"use client"

import { useState, useMemo } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/layout/page-header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Search, Mail } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: "はじめに",
    items: [
      {
        question: "LINE connect CRMとは何ですか？",
        answer:
          "LINE connect CRMは、LINE公式アカウントと連携して友だち（顧客）を管理するためのシステムです。セミナー管理、婚活スクール運営、メッセージ配信など、ビジネスに必要な機能を備えています。",
      },
      {
        question: "初期設定の手順を教えてください。",
        answer:
          "アカウント登録後、設定ページからLINE公式アカウントとの連携を行ってください。Webhook URLを設定し、チャネルアクセストークンとチャネルシークレットを入力することで連携が完了します。",
      },
      {
        question: "料金プランについて教えてください。",
        answer:
          "料金プランの詳細については、管理者にお問い合わせください。プランによって利用可能な機能や友だち数の上限が異なります。",
      },
    ],
  },
  {
    title: "LINE連携",
    items: [
      {
        question: "LINE公式アカウントとの連携方法は？",
        answer:
          "設定 > LINE連携から、LINE Developers コンソールで取得したチャネルアクセストークンとチャネルシークレットを入力してください。Webhook URLは自動生成されます。",
      },
      {
        question: "Webhookが正しく動作しているか確認するには？",
        answer:
          "設定 > LINE連携ページの「テスト送信」ボタンを押すことで、Webhook接続のテストが可能です。成功すると緑色のチェックマークが表示されます。",
      },
      {
        question: "友だち追加時に自動でCRMに登録されますか？",
        answer:
          "はい、LINE連携が正しく設定されていれば、新しい友だちが追加されると自動的にCRMに登録されます。表示名やプロフィール画像も取得されます。",
      },
    ],
  },
  {
    title: "友だち管理",
    items: [
      {
        question: "友だちにタグを付けるには？",
        answer:
          "友だち一覧から対象の友だちを選択し、詳細画面でタグの追加・削除が可能です。複数のタグを同時に設定することもできます。",
      },
      {
        question: "友だちの情報をCSVでエクスポートできますか？",
        answer:
          "はい、友だち一覧ページの「エクスポート」ボタンからCSV形式でダウンロードできます。フィルタを適用した状態でのエクスポートも可能です。",
      },
      {
        question: "友だちのステータスの種類は？",
        answer:
          "ステータスは「フォロー中」「ブロック」「未フォロー」の3種類があります。LINEでブロックされた場合は自動的にステータスが更新されます。",
      },
      {
        question: "友だちを検索するには？",
        answer:
          "友だち一覧ページの検索バーから、表示名、カスタム名、メールアドレス、電話番号、メモの内容で検索できます。タグやステータスでのフィルタリングも可能です。",
      },
    ],
  },
  {
    title: "セミナー管理",
    items: [
      {
        question: "新しいセミナーを作成するには？",
        answer:
          "セミナー管理ページの「新規作成」ボタンから、セミナー名、日時、会場、定員などの情報を入力して作成できます。",
      },
      {
        question: "セミナーの参加者を管理するには？",
        answer:
          "セミナー詳細ページから参加者の追加・削除、出欠状況の管理ができます。友だち一覧から直接セミナーに登録することも可能です。",
      },
      {
        question: "セミナーの開催状況を変更するには？",
        answer:
          "セミナー詳細ページでステータスを「募集中」「締切」「終了」「中止」に変更できます。",
      },
      {
        question: "Googleカレンダーと連携できますか？",
        answer:
          "はい、設定からGoogleアカウントを連携することで、セミナーの予定をGoogleカレンダーに自動同期できます。",
      },
    ],
  },
  {
    title: "婚活スクール",
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
      {
        question: "交際・成婚の管理はどうしますか？",
        answer:
          "交際管理ページで交際状況の記録と進捗管理ができます。成婚が決まった場合は、成婚登録を行うことで統計に反映されます。",
      },
    ],
  },
  {
    title: "配信・メッセージ",
    items: [
      {
        question: "一斉配信の方法は？",
        answer:
          "配信ページから、対象のタグやフィルタ条件を設定し、メッセージを作成して配信できます。テキスト、画像、リッチメッセージなどが送信可能です。",
      },
      {
        question: "配信のプレビューはできますか？",
        answer:
          "はい、配信作成画面で「プレビュー」ボタンを押すと、実際のLINEでの表示イメージを確認できます。",
      },
      {
        question: "メッセージテンプレートとは？",
        answer:
          "よく使うメッセージをテンプレートとして保存できる機能です。テンプレートページから作成・管理でき、配信時に選択して利用できます。",
      },
      {
        question: "個別メッセージは送信できますか？",
        answer:
          "はい、友だち詳細ページからテキストメッセージを個別に送信できます。送信履歴も確認可能です。",
      },
    ],
  },
  {
    title: "決済・請求",
    items: [
      {
        question: "決済機能の設定方法は？",
        answer:
          "設定 > 決済設定からStripeアカウントとの連携を行います。APIキーを入力し、Webhookを設定することで決済機能が有効になります。",
      },
      {
        question: "請求書の発行はできますか？",
        answer:
          "決済管理ページから、支払い履歴の確認と請求情報の管理ができます。Stripeダッシュボードから詳細な請求書の発行も可能です。",
      },
      {
        question: "決済の管理はどこで行いますか？",
        answer:
          "決済ページで支払い状況の一覧確認、個別の決済詳細の確認ができます。Stripeと連携している場合はリアルタイムで同期されます。",
      },
    ],
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return faqSections

    const query = searchQuery.toLowerCase()
    return faqSections
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
        title="ヘルプセンター"
        description="よくある質問と使い方ガイド"
      />

      {/* 検索 */}
      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="質問を検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ セクション */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-1">検索結果が見つかりません</p>
          <p className="text-sm">別のキーワードで検索してみてください。</p>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {section.title}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Accordion type="single" collapsible>
                  {section.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${section.title}-${index}`}
                      className="px-4"
                    >
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
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
          className="inline-flex items-center gap-2 rounded-md bg-[#06C755] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#05b54c] transition-colors"
        >
          <Mail className="w-4 h-4" />
          サポートに連絡
        </a>
      </div>
    </AppLayout>
  )
}
