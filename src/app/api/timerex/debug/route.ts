import { NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Timerex Webhook デバッグ閲覧エンドポイント
//
// 直近 20 件の Timerex Webhook 受信ログ（生 payload 含む）を返す。
// CRM ログイン中ユーザーのみアクセス可能。
//
// 使い方:
//   1. Timerex 管理画面で本 CRM の webhook URL を登録
//   2. テスト予約を 1 件実施
//   3. ブラウザで本エンドポイントを開く（ログイン状態で）
//   4. JSON で直近の生 payload が表示される
//   5. 中身を確認して開発者と共有
//
// このエンドポイントは Timerex の payload 構造を実機で確認するための
// デバッグ用。動作確認が完了したら、運用上は使わなくなる。
export async function GET() {
  try {
    // CRM 管理者のみアクセス可能
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) return auth.response

    const admin = createAdminClient()

    // event_type="timerex_webhook_received" の最新 20 件を取得
    const { data, error } = await admin
      .from("message_logs")
      .select("id, raw_event, created_at")
      .eq("event_type", "timerex_webhook_received")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[timerex-debug] query failed", error)
      return NextResponse.json(
        { error: "ログの取得に失敗しました", detail: String(error) },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        count: (data || []).length,
        description:
          "Timerex Webhook の生 payload です。一番新しい受信が一番上に表示されます。",
        howToShare:
          "下記の JSON 全体を選択してコピーし、開発担当者に共有してください。",
        logs: data || [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    )
  } catch (error) {
    console.error("[timerex-debug] handler error", error)
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    )
  }
}
