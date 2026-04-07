import { createAdminClient } from "@/lib/supabase/server"
import { getProfile, replyMessage, pushMessage } from "./client"
import { createWelcomeMessage, createDefaultReply } from "./messages"
import { createSeminarListMessage, createApplyConfirmMessage, createFollowupResponseMessage, createSurveyRewardMessage, createSingleQuestionMessage } from "./flex-templates"

// Webhookイベントの簡易型（LINEから受信するrawデータ）
interface WebhookEvent {
  type: string
  timestamp: number
  source: { type: string; userId?: string; groupId?: string }
  replyToken?: string
  message?: { id: string; type: string; text?: string }
  postback?: { data: string; params?: Record<string, string> }
}

interface WebhookContext {
  organizationId: string
  lineAccountId: string
  channelAccessToken: string
  channelName: string
}

// Webhookイベントの処理
export async function handleWebhookEvent(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  switch (event.type) {
    case "follow":
      await handleFollow(event, context)
      break
    case "unfollow":
      await handleUnfollow(event, context)
      break
    case "message":
      await handleMessage(event, context)
      break
    case "postback":
      await handlePostback(event, context)
      break
    default:
      break
  }
}

// 友だち追加イベント
async function handleFollow(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  const supabase = createAdminClient()
  const userId = event.source.userId
  if (!userId) return

  // LINEプロフィール取得
  const profile = await getProfile(userId, {
    accessToken: context.channelAccessToken,
  })

  // 友だちをUPSERT
  await supabase.from("friends").upsert(
    {
      organization_id: context.organizationId,
      line_account_id: context.lineAccountId,
      line_user_id: userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl,
      status: "active",
      first_added_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,line_user_id" }
  )

  // 「新規」タグを自動付与
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("name", "新規")
    .single()

  if (tag) {
    const { data: friend } = await supabase
      .from("friends")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("line_user_id", userId)
      .single()

    if (friend) {
      await supabase.from("friend_tags").upsert(
        {
          friend_id: friend.id,
          tag_id: tag.id,
          auto_assigned: true,
        },
        { onConflict: "friend_id,tag_id" }
      )
    }
  }

  // 時間制限付き自動タグルールのチェック
  const { data: autoTagRules } = await (supabase
    .from("auto_tag_rules" as never)
    .select("*")
    .eq("organization_id" as never, context.organizationId)
    .eq("enabled" as never, true) as unknown as Promise<{
      data: Array<{
        id: string; tag_id: string | null; tag_name: string;
        duration_minutes: number | null; schedule_type: string | null;
        start_at: string | null; end_at: string | null; created_at: string
      }> | null
      error: unknown
    }>)

  if (autoTagRules && autoTagRules.length > 0) {
    const now = new Date()
    const { data: followFriend } = await supabase
      .from("friends")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("line_user_id", userId)
      .single()

    if (followFriend) {
      for (const rule of autoTagRules) {
        let isWithinWindow = false

        if (rule.schedule_type === "scheduled") {
          // 指定時間帯モード: start_at〜end_atの間か判定
          if (rule.start_at && rule.end_at) {
            const startAt = new Date(rule.start_at)
            const endAt = new Date(rule.end_at)
            isWithinWindow = now >= startAt && now <= endAt
          }
        } else {
          // 従来の期間モード: created_at + duration_minutes
          if (rule.duration_minutes) {
            const ruleCreated = new Date(rule.created_at)
            const expiresAt = new Date(ruleCreated.getTime() + rule.duration_minutes * 60 * 1000)
            isWithinWindow = now <= expiresAt
          }
        }

        if (isWithinWindow) {
          // ルール有効期間内 → タグ付与
          let ruleTagId = rule.tag_id
          if (!ruleTagId) {
            const { data: existingTag } = await supabase
              .from("tags")
              .select("id")
              .eq("organization_id", context.organizationId)
              .eq("name", rule.tag_name)
              .single()
            if (existingTag) {
              ruleTagId = existingTag.id
            } else {
              const { data: newTag } = await supabase
                .from("tags")
                .insert({ organization_id: context.organizationId, name: rule.tag_name })
                .select("id")
                .single()
              ruleTagId = newTag?.id || null
            }
          }
          if (ruleTagId) {
            await supabase.from("friend_tags").upsert(
              { friend_id: followFriend.id, tag_id: ruleTagId, auto_assigned: true },
              { onConflict: "friend_id,tag_id" }
            )
          }
        }
      }
    }
  }

  // ウェルカムメッセージ送信（管理画面の設定を使用）
  if (event.replyToken) {
    const { data: greetingSettings } = await (supabase
      .from("greeting_settings" as never)
      .select("*")
      .eq("organization_id" as never, context.organizationId)
      .single() as unknown as Promise<{
        data: {
          enabled: boolean; message: string | null;
          schedule_enabled: boolean; schedule_start: string | null;
          schedule_end: string | null; schedule_message: string | null;
        } | null
        error: unknown
      }>)

    const gs = greetingSettings
    let greetingDisabled = false
    let customMessage: string | null = null

    if (gs) {
      if (!gs.enabled) {
        greetingDisabled = true
      } else {
        // 期間指定メッセージの判定
        if (gs.schedule_enabled && gs.schedule_start && gs.schedule_end && gs.schedule_message) {
          const now = new Date()
          const start = new Date(gs.schedule_start)
          const end = new Date(gs.schedule_end)
          if (now >= start && now <= end) {
            customMessage = gs.schedule_message
          }
        }
        // 期間指定でなければ通常カスタムメッセージ
        if (!customMessage && gs.message) {
          customMessage = gs.message
        }
      }
    }

    if (!greetingDisabled) {
      if (customMessage) {
        await replyMessage(
          event.replyToken,
          [{ type: "text", text: customMessage }],
          { accessToken: context.channelAccessToken }
        )
      } else {
        await replyMessage(
          event.replyToken,
          [createWelcomeMessage(context.channelName)],
          { accessToken: context.channelAccessToken }
        )
      }
    }
  }

  // メッセージログ記録
  await supabase.from("message_logs").insert({
    organization_id: context.organizationId,
    line_user_id: userId,
    event_type: "follow",
    raw_event: JSON.parse(JSON.stringify(event)),
  })
}

// ブロック（友だち解除）イベント
async function handleUnfollow(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  const supabase = createAdminClient()
  const userId = event.source.userId
  if (!userId) return

  await supabase
    .from("friends")
    .update({ status: "blocked" })
    .eq("organization_id", context.organizationId)
    .eq("line_user_id", userId)

  await supabase.from("message_logs").insert({
    organization_id: context.organizationId,
    line_user_id: userId,
    event_type: "unfollow",
    raw_event: JSON.parse(JSON.stringify(event)),
  })
}

// メッセージイベント
async function handleMessage(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  const supabase = createAdminClient()
  const userId = event.source.userId
  if (!userId || !event.message) return

  // 友だちが存在しなければ自動登録
  const { data: existingFriend } = await supabase
    .from("friends")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("line_user_id", userId)
    .single()

  let friendId = existingFriend?.id

  if (!friendId) {
    // プロフィール取得して新規登録
    try {
      const profile = await getProfile(userId, {
        accessToken: context.channelAccessToken,
      })
      const { data: newFriend } = await supabase
        .from("friends")
        .upsert(
          {
            organization_id: context.organizationId,
            line_account_id: context.lineAccountId,
            line_user_id: userId,
            display_name: profile.displayName,
            picture_url: profile.pictureUrl,
            status: "active",
            first_added_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,line_user_id" }
        )
        .select("id")
        .single()
      friendId = newFriend?.id
    } catch {
      // プロフィール取得失敗時は最低限の情報で登録
      const { data: newFriend } = await supabase
        .from("friends")
        .upsert(
          {
            organization_id: context.organizationId,
            line_account_id: context.lineAccountId,
            line_user_id: userId,
            display_name: "LINE User",
            status: "active",
            first_added_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,line_user_id" }
        )
        .select("id")
        .single()
      friendId = newFriend?.id
    }
  } else {
    // 既存友だちのlast_message_atを更新
    await supabase
      .from("friends")
      .update({ last_message_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId)
      .eq("line_user_id", userId)
  }

  // メッセージログ記録
  await supabase.from("message_logs").insert({
    organization_id: context.organizationId,
    friend_id: friendId || null,
    line_user_id: userId,
    event_type: "message",
    message_type: event.message.type,
    content: event.message.text || "",
    raw_event: JSON.parse(JSON.stringify(event)),
  })

  // テキストメッセージの場合のみキーワード判定
  if (event.message.type !== "text" || !event.message.text) return
  const text = event.message.text.trim()

  if (text === "セミナー一覧" || text === "セミナー") {
    await handleSeminarList(event, context)
  } else if (text.startsWith("参加申込")) {
    await handleApply(event, context, text)
  } else if (text === "参加履歴" || text === "マイページ") {
    await handleHistory(event, context)
  } else if (text.startsWith("キャンセル")) {
    await handleCancel(event, context, text)
  } else if (text === "コーチング予約") {
    await handleBookingList(event, context)
  } else if (text === "予約確認") {
    await handleBookingConfirm(event, context)
  } else if (text === "予約キャンセル") {
    await handleBookingCancel(event, context)
  } else {
    // デフォルト応答
    if (event.replyToken) {
      await replyMessage(
        event.replyToken,
        [createDefaultReply()],
        { accessToken: context.channelAccessToken }
      )
    }
  }
}

// セミナー一覧
async function handleSeminarList(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  const supabase = createAdminClient()

  const { data: seminars } = await supabase
    .from("seminars")
    .select("id, title, event_date, start_time, end_time, location, capacity")
    .eq("organization_id", context.organizationId)
    .eq("status", "open")
    .order("event_date", { ascending: true })
    .limit(10)

  if (!seminars || seminars.length === 0) {
    if (event.replyToken) {
      await replyMessage(
        event.replyToken,
        [{ type: "text", text: "現在募集中のセミナーはありません。" }],
        { accessToken: context.channelAccessToken }
      )
    }
    return
  }

  // 各セミナーの申込数を取得
  const seminarInfos = await Promise.all(
    seminars.map(async (s: { id: string; title: string; event_date: string; start_time: string | null; end_time: string | null; location: string | null; capacity: number }) => {
      const { count } = await supabase
        .from("attendances")
        .select("*", { count: "exact", head: true })
        .eq("seminar_id", s.id)
        .neq("status", "cancelled")

      return {
        id: s.id,
        title: s.title,
        eventDate: s.event_date,
        startTime: s.start_time?.slice(0, 5),
        endTime: s.end_time?.slice(0, 5),
        location: s.location || undefined,
        capacity: s.capacity,
        attendeeCount: count || 0,
      }
    })
  )

  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [createSeminarListMessage(seminarInfos)],
      { accessToken: context.channelAccessToken }
    )
  }
}

// セミナー申込
async function handleApply(
  event: WebhookEvent,
  context: WebhookContext,
  _text: string
): Promise<void> {
  // 基本実装 - 詳細はDay 3で拡張
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "申込機能は準備中です。もう少々お待ちください。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// 参加履歴
async function handleHistory(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "参加履歴機能は準備中です。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// キャンセル
async function handleCancel(
  event: WebhookEvent,
  context: WebhookContext,
  _text: string
): Promise<void> {
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "キャンセル機能は準備中です。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// コーチング予約一覧
async function handleBookingList(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "コーチング予約機能は準備中です。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// 予約確認
async function handleBookingConfirm(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "予約確認機能は準備中です。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// 予約キャンセル
async function handleBookingCancel(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  if (event.replyToken) {
    await replyMessage(
      event.replyToken,
      [{ type: "text", text: "予約キャンセル機能は準備中です。" }],
      { accessToken: context.channelAccessToken }
    )
  }
}

// Postbackイベント
async function handlePostback(
  event: WebhookEvent,
  context: WebhookContext
): Promise<void> {
  const supabase = createAdminClient()
  const data = event.postback?.data
  if (!data) return

  const params = new URLSearchParams(data)
  const action = params.get("action")

  await supabase.from("message_logs").insert({
    organization_id: context.organizationId,
    line_user_id: event.source.userId,
    event_type: "postback",
    content: data,
    raw_event: JSON.parse(JSON.stringify(event)),
  })

  switch (action) {
    case "apply_seminar": {
      const seminarId = params.get("seminar_id")
      const userId = event.source.userId
      if (!seminarId || !userId) break

      // 友だちを取得
      const { data: friend } = await supabase
        .from("friends")
        .select("id")
        .eq("line_user_id", userId)
        .eq("organization_id", context.organizationId)
        .single()

      if (!friend) break

      // 既に申込済みか確認
      const { data: existing } = await supabase
        .from("attendances")
        .select("id, status")
        .eq("friend_id", friend.id)
        .eq("seminar_id", seminarId)
        .single()

      if (existing && existing.status !== "cancelled") {
        if (event.replyToken) {
          await replyMessage(
            event.replyToken,
            [{ type: "text", text: "すでにお申込み済みです。" }],
            { accessToken: context.channelAccessToken }
          )
        }
        break
      }

      // セミナー情報取得
      const { data: seminar } = await supabase
        .from("seminars")
        .select("*")
        .eq("id", seminarId)
        .single()

      if (!seminar) break

      // 定員チェック
      const { count: currentCount } = await supabase
        .from("attendances")
        .select("*", { count: "exact", head: true })
        .eq("seminar_id", seminarId)
        .neq("status", "cancelled")

      if (seminar.capacity > 0 && (currentCount || 0) >= seminar.capacity) {
        if (event.replyToken) {
          await replyMessage(
            event.replyToken,
            [{ type: "text", text: "申し訳ございません。定員に達したため、お申込みを受け付けることができません。" }],
            { accessToken: context.channelAccessToken }
          )
        }
        break
      }

      // 出席レコード作成（キャンセル済みの場合はupsert）
      if (existing && existing.status === "cancelled") {
        await supabase
          .from("attendances")
          .update({ status: "applied", applied_at: new Date().toISOString(), cancelled_at: null, cancel_reason: null })
          .eq("id", existing.id)
      } else {
        await supabase
          .from("attendances")
          .insert({
            organization_id: context.organizationId,
            friend_id: friend.id,
            seminar_id: seminarId,
            status: "applied",
            applied_at: new Date().toISOString(),
          })
      }

      // 申込確認メッセージ送信
      if (event.replyToken) {
        const confirmMsg = createApplyConfirmMessage({
          id: seminar.id,
          title: seminar.title,
          eventDate: seminar.event_date,
          startTime: seminar.start_time ?? undefined,
          endTime: seminar.end_time ?? undefined,
          location: seminar.location ?? undefined,
          capacity: seminar.capacity,
          attendeeCount: (currentCount || 0) + 1,
        })
        await replyMessage(
          event.replyToken,
          [confirmMsg],
          { accessToken: context.channelAccessToken }
        )
      }
      break
    }
    case "cancel_seminar":
      // キャンセル処理
      break
    case "omiai_result":
      // お見合い結果処理
      break
    case "booking_reserve":
      // 予約確定処理
      break
    case "booking_cancel":
      // 予約キャンセル処理
      break
    case "followup_response": {
      const seminarId = params.get("seminar_id")
      const buttonIndex = parseInt(params.get("button_index") || "0", 10)
      const userId = event.source.userId
      if (!seminarId || !userId) break

      // フォローアップ設定を取得
      // seminar_followups テーブルはDB型定義に未追加のため any でキャスト
      const { data: followup } = await (supabase
        .from("seminar_followups" as never)
        .select("*")
        .eq("seminar_id" as never, seminarId)
        .single() as unknown as Promise<{ data: { buttons: unknown } | null; error: unknown }>)

      if (!followup) break

      const buttons = followup.buttons as Array<{
        label: string
        tagName: string
        responseMessage: string
        responseUrl: string
      }>
      const button = buttons?.[buttonIndex]
      if (!button) break

      // タグの自動作成（存在しなければ作成）
      let { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("name", button.tagName)
        .single()

      if (!tag) {
        const { data: newTag } = await supabase
          .from("tags")
          .insert({
            organization_id: context.organizationId,
            name: button.tagName,
          })
          .select("id")
          .single()
        tag = newTag
      }

      // 友だちを取得してタグを付与
      const { data: friend } = await supabase
        .from("friends")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .single()

      if (friend && tag) {
        await supabase.from("friend_tags").upsert(
          {
            friend_id: friend.id,
            tag_id: tag.id,
            auto_assigned: true,
          },
          { onConflict: "friend_id,tag_id" }
        )
      }

      // 応答メッセージを送信
      if (event.replyToken) {
        await replyMessage(
          event.replyToken,
          [createFollowupResponseMessage(button.responseMessage, button.responseUrl)],
          { accessToken: context.channelAccessToken }
        )
      }

      // フォローアップ応答ログ記録
      await supabase.from("message_logs").insert({
        organization_id: context.organizationId,
        friend_id: friend?.id || null,
        line_user_id: userId,
        event_type: "followup_response",
        content: `seminar_id=${seminarId}&button_index=${buttonIndex}&tag=${button.tagName}`,
        raw_event: JSON.parse(JSON.stringify(event)),
      })
      break
    }
    case "survey_answer": {
      const surveyId = params.get("seminar_id") // survey_id を seminar_id パラメータで渡している
      const qIndex = parseInt(params.get("q") || "0", 10)
      const cIndex = parseInt(params.get("c") || "0", 10)
      const userId = event.source.userId
      if (!surveyId || !userId) break

      // スタンドアロンアンケート (surveys テーブル) を先に検索
      let surveyTitle = ""
      let questions: Array<{
        label: string
        hasReward?: boolean
        choices: Array<{
          text: string; tagName: string;
          rewardMessage?: string; rewardUrl?: string;
          file?: { url: string; mimeType: string } | null; fileLink?: string;
        }>
      }> = []

      const { data: standaloneSurvey } = await (supabase
        .from("surveys" as never)
        .select("*")
        .eq("id" as never, surveyId)
        .single() as unknown as Promise<{
          data: { id: string; title: string; questions: string } | null
          error: unknown
        }>)

      if (standaloneSurvey) {
        surveyTitle = standaloneSurvey.title
        questions = typeof standaloneSurvey.questions === "string"
          ? JSON.parse(standaloneSurvey.questions)
          : standaloneSurvey.questions || []
      } else {
        // フォールバック: セミナーアンケート
        const { data: seminarSurvey } = await (supabase
          .from("seminar_surveys" as never)
          .select("*")
          .eq("seminar_id" as never, surveyId)
          .eq("organization_id" as never, context.organizationId)
          .single() as unknown as Promise<{ data: { questions: string } | null; error: unknown }>)

        if (!seminarSurvey) break
        questions = JSON.parse(seminarSurvey.questions || "[]")
      }

      const question = questions[qIndex]
      const choice = question?.choices?.[cIndex]
      if (!choice) break

      // 友だちを取得
      const { data: surveyFriend } = await supabase
        .from("friends")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .single()

      // タグの自動作成・付与
      if (choice.tagName && surveyFriend) {
        let { data: surveyTag } = await supabase
          .from("tags")
          .select("id")
          .eq("organization_id", context.organizationId)
          .eq("name", choice.tagName)
          .single()

        if (!surveyTag) {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({ organization_id: context.organizationId, name: choice.tagName })
            .select("id")
            .single()
          surveyTag = newTag
        }

        if (surveyTag) {
          await supabase.from("friend_tags").upsert(
            { friend_id: surveyFriend.id, tag_id: surveyTag.id, auto_assigned: true },
            { onConflict: "friend_id,tag_id" }
          )
        }
      }

      // 回答をsurvey_responsesテーブルに記録
      try {
        await (supabase
          .from("survey_responses" as never)
          .insert({
            organization_id: context.organizationId,
            survey_id: surveyId,
            friend_id: surveyFriend?.id || null,
            line_user_id: userId,
            question_index: qIndex,
            choice_index: cIndex,
            question_label: question.label,
            choice_text: choice.text,
            tag_name: choice.tagName || null,
          } as never) as unknown as Promise<{ error: unknown }>)
      } catch {
        // テーブル未作成でもエラーを無視して続行
      }

      // 回答ログ記録
      await supabase.from("message_logs").insert({
        organization_id: context.organizationId,
        friend_id: surveyFriend?.id || null,
        line_user_id: userId,
        event_type: "survey_answer",
        content: `survey_id=${surveyId}&q=${qIndex}&c=${cIndex}&answer=${choice.text}&tag=${choice.tagName}`,
        raw_event: JSON.parse(JSON.stringify(event)),
      })

      // 特典の有無を判定（hasReward フラグ or 特典情報の存在）
      const hasReward = question.hasReward !== false && (choice.rewardMessage || choice.rewardUrl)

      // replyToken で特典 or 回答確認メッセージを送信
      let replyUsed = false
      if (event.replyToken && hasReward) {
        const rewardMsg = choice.rewardMessage || "アンケートにご回答いただきありがとうございます！"
        await replyMessage(
          event.replyToken,
          [createSurveyRewardMessage(rewardMsg, choice.rewardUrl)],
          { accessToken: context.channelAccessToken }
        )
        replyUsed = true
      }

      // 次の質問があれば送信（段階的送信）
      const nextQIndex = qIndex + 1
      if (nextQIndex < questions.length) {
        const nextQuestion = questions[nextQIndex]
        const nextMessage = createSingleQuestionMessage({
          surveyId,
          surveyTitle: surveyTitle || "アンケート",
          question: nextQuestion,
          questionIndex: nextQIndex,
          totalQuestions: questions.length,
        })

        if (!replyUsed && event.replyToken) {
          // 特典なし → replyTokenで次の質問を送信
          await replyMessage(
            event.replyToken,
            [nextMessage],
            { accessToken: context.channelAccessToken }
          )
        } else {
          // 特典送信済み → pushMessageで次の質問を送信
          try {
            await pushMessage(userId, [nextMessage], {
              accessToken: context.channelAccessToken,
            })
          } catch {
            // push失敗は無視
          }
        }
      } else {
        // 全問回答完了
        if (!replyUsed && event.replyToken) {
          await replyMessage(
            event.replyToken,
            [{ type: "text", text: "アンケートにご回答いただきありがとうございます！全ての質問にお答えいただきました。" }],
            { accessToken: context.channelAccessToken }
          )
        }
      }
      break
    }
    default:
      break
  }
}
