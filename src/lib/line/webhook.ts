import { createAdminClient } from "@/lib/supabase/server"
import { getProfile, replyMessage, pushMessage } from "./client"
import { createWelcomeMessage } from "./messages"
import { createSeminarListMessage, createApplyConfirmMessage, createFollowupResponseMessage, createSurveyRewardMessage, createSingleQuestionMessage, createPaymentMessage, createZoomLinkMessage } from "./flex-templates"

// メッセージタグ置換（{name} → ユーザー名）
function replaceMessageTags(text: string, displayName: string): string {
  return text.replace(/\{name\}/g, displayName).replace(/\{名前\}/g, displayName)
}

// Webhookイベントの簡易型（LINEから受信するrawデータ）
interface WebhookEvent {
  type: string
  timestamp: number
  source: { type: string; userId?: string; groupId?: string }
  replyToken?: string
  message?: { id: string; type: string; text?: string }
  postback?: { data: string; params?: Record<string, string> }
  // LINE は webhook 応答が 1 秒以内に 2xx を返せなかったとき同じイベントを
  // 自動で再配信する。再配信時は deliveryContext.isRedelivery=true になる。
  // これを見て二重処理を防がないと、reply が失敗したときの push フォールバック
  // と組み合わさって、同じメッセージがユーザーに複数回届いてしまう。
  deliveryContext?: { isRedelivery: boolean }
  webhookEventId?: string
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
  // 再配信イベントは処理をスキップする。
  // LINE 側で webhook 応答が 1 秒以内に返らなかった場合に同じ event を
  // 再配信してくる仕様があり、二重処理すると DB 行の重複や、reply→push
  // フォールバックによるメッセージ二重送信の原因になる。
  // LINE はこのフラグで「再配信です」と明示してくれているので、それを信頼して弾く。
  if (event.deliveryContext?.isRedelivery) {
    console.log(
      `[webhook] skipping redelivery event type=${event.type} webhookEventId=${event.webhookEventId || "unknown"}`
    )
    return
  }

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

  // LINEプロフィール取得（失敗した場合はここで終了）
  let profile: { displayName: string; pictureUrl?: string }
  try {
    profile = await getProfile(userId, {
      accessToken: context.channelAccessToken,
    })
  } catch (err) {
    console.error("handleFollow: getProfile failed", err)
    return
  }

  // 既存の友だちレコードを先に確認する
  // 「これから登録される方にのみ挨拶を送る／既存の友だち（再フォロー含む）には送らない」
  // という要件を満たすため、必ず upsert より先にチェックする。
  //
  // 既存チェック自体が失敗した場合は安全側に倒して isNewFriend=false として扱い、
  // 挨拶メッセージが誤って既存の友だちに届くのを防ぐ。
  let isNewFriend = false
  try {
    const { data: existing, error: existingErr } = await supabase
      .from("friends")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("line_user_id", userId)
      .maybeSingle()

    if (existingErr) {
      console.error("handleFollow: existing friend lookup failed", existingErr)
      isNewFriend = false
    } else {
      isNewFriend = !existing
    }
  } catch (err) {
    console.error("handleFollow: existing friend lookup threw", err)
    isNewFriend = false
  }

  // 友だちレコードの作成 or 更新
  // 既存の場合は first_added_at を維持し、ステータスとプロフィール情報だけ更新する。
  try {
    if (isNewFriend) {
      await supabase.from("friends").insert({
        organization_id: context.organizationId,
        line_account_id: context.lineAccountId,
        line_user_id: userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        status: "active",
        first_added_at: new Date().toISOString(),
      })
    } else {
      await supabase
        .from("friends")
        .update({
          status: "active",
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
        })
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
    }
  } catch (err) {
    console.error("handleFollow: friend upsert failed", err)
  }

  // follow イベントのメッセージログは新規/既存に関係なく記録する
  try {
    await supabase.from("message_logs").insert({
      organization_id: context.organizationId,
      line_user_id: userId,
      event_type: "follow",
      raw_event: JSON.parse(JSON.stringify(event)),
    })
  } catch (err) {
    console.error("handleFollow: message_logs insert failed", err)
  }

  // 既存の友だち（再フォロー等）には挨拶・自動タグ・フォローアップ・アンケート・
  // ステップ配信を一切行わない。ここで早期 return する。
  if (!isNewFriend) return

  // ========================================================================
  // ここから下は「本当に新規に友だち追加した人」に対してのみ実行される。
  // ========================================================================

  // 「新規」タグを自動付与
  try {
    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("name", "新規")
      .maybeSingle()

    if (tag) {
      const { data: friend } = await supabase
        .from("friends")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .maybeSingle()

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
  } catch (err) {
    console.error("handleFollow: 新規 tag assign failed", err)
  }

  // 時間制限付き自動タグルールのチェック
  try {
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
        .maybeSingle()

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
                .maybeSingle()
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
  } catch (err) {
    console.error("handleFollow: auto tag rules failed", err)
  }

  // ウェルカムメッセージ送信（管理画面の設定を使用）
  // greeting_settings テーブルの読み込みや reply の失敗で handleFollow 全体が
  // 落ちないよう、全体を try/catch で囲う。reply が失敗しても push で救う。
  type GreetingSettings = {
    enabled: boolean
    message: string | null
    schedule_enabled: boolean
    schedule_start: string | null
    schedule_end: string | null
    schedule_message: string | null
    welcome_survey_id: string | null
    schedule_survey_id: string | null
    follow_up_messages: string[] | null
  }

  try {
    let gs: GreetingSettings | null = null

    try {
      const { data: greetingSettings } = await (supabase
        .from("greeting_settings" as never)
        .select("*")
        .eq("organization_id" as never, context.organizationId)
        .maybeSingle() as unknown as Promise<{
          data: GreetingSettings | null
          error: unknown
        }>)
      gs = greetingSettings
    } catch (err) {
      console.error("handleFollow: greeting_settings lookup failed", err)
      gs = null
    }

    let greetingDisabled = false
    let customMessage: string | null = null
    let isScheduleActive = false

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
            isScheduleActive = true
          }
        }
        // 期間指定でなければ通常カスタムメッセージ
        if (!customMessage && gs.message) {
          customMessage = gs.message
        }
      }
    }

    if (!greetingDisabled) {
      const welcomeMessages: unknown[] = customMessage
        ? [{ type: "text", text: replaceMessageTags(customMessage, profile.displayName) }]
        : [createWelcomeMessage(context.channelName)]

      let sent = false
      if (event.replyToken) {
        try {
          await replyMessage(
            event.replyToken,
            welcomeMessages,
            { accessToken: context.channelAccessToken }
          )
          sent = true
        } catch (err) {
          console.error("handleFollow: welcome replyMessage failed, falling back to push", err)
        }
      }
      // reply が無い or 失敗した場合は push でフォールバック
      if (!sent) {
        try {
          await pushMessage(userId, welcomeMessages, {
            accessToken: context.channelAccessToken,
          })
        } catch (err) {
          console.error("handleFollow: welcome pushMessage fallback failed", err)
        }
      }
    }

    // フォローアップメッセージの自動送信
    if (gs?.follow_up_messages && gs.follow_up_messages.length > 0) {
      for (const msg of gs.follow_up_messages) {
        if (msg.trim()) {
          try {
            await pushMessage(userId, [{ type: "text", text: replaceMessageTags(msg, profile.displayName) }], {
              accessToken: context.channelAccessToken,
            })
          } catch (err) {
            console.error("handleFollow: follow-up push failed", err)
          }
        }
      }
    }

    // アンケートの自動送信（期間指定中はschedule_survey_id、通常はwelcome_survey_id）
    const activeSurveyId = isScheduleActive ? (gs?.schedule_survey_id || gs?.welcome_survey_id) : gs?.welcome_survey_id
    if (activeSurveyId) {
      try {
        const { data: welcomeSurvey } = await (supabase
          .from("surveys" as never)
          .select("*")
          .eq("id" as never, activeSurveyId)
          .maybeSingle() as unknown as Promise<{
            data: { id: string; title: string; questions: string } | null
            error: unknown
          }>)

        if (welcomeSurvey) {
          const surveyQuestions = typeof welcomeSurvey.questions === "string"
            ? JSON.parse(welcomeSurvey.questions)
            : welcomeSurvey.questions || []

          if (surveyQuestions.length > 0) {
            const firstQuestion = surveyQuestions[0]
            const firstMessage = createSingleQuestionMessage({
              surveyId: welcomeSurvey.id,
              surveyTitle: welcomeSurvey.title,
              question: firstQuestion,
              questionIndex: 0,
              totalQuestions: surveyQuestions.length,
            })
            await pushMessage(userId, [firstMessage], {
              accessToken: context.channelAccessToken,
            })
          }
        }
      } catch (err) {
        console.error("handleFollow: welcome survey send failed", err)
      }
    }
  } catch (err) {
    console.error("handleFollow: welcome flow failed", err)
  }

  // ステップ配信キューの登録
  try {
    const { data: stepSettings } = await (supabase
      .from("step_message_settings" as never)
      .select("*")
      .eq("organization_id" as never, context.organizationId)
      .maybeSingle() as unknown as Promise<{
        data: {
          enabled: boolean
          steps: Array<{ delay_days: number; delay_hours: number; message: string; enabled: boolean }>
        } | null
        error: unknown
      }>)

    if (stepSettings?.enabled && stepSettings.steps?.length > 0) {
      const { data: friendForStep } = await supabase
        .from("friends")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .maybeSingle()

      if (friendForStep) {
        const now = new Date()
        const queueItems = stepSettings.steps
          .filter(s => s.enabled && s.message.trim())
          .map((step, idx) => {
            const scheduledAt = new Date(now.getTime() + (step.delay_days * 24 + step.delay_hours) * 60 * 60 * 1000)
            return {
              organization_id: context.organizationId,
              friend_id: friendForStep.id,
              line_user_id: userId,
              step_index: idx,
              message: step.message,
              scheduled_at: scheduledAt.toISOString(),
              status: "pending",
            }
          })

        if (queueItems.length > 0) {
          await (supabase
            .from("step_message_queue" as never)
            .insert(queueItems as never) as unknown as Promise<{ error: unknown }>)
        }
      }
    }
  } catch (err) {
    console.error("handleFollow: step message queue failed", err)
  }
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
    // キーワードに該当しない場合は何もしない（LINE側の応答設定に委ねる）
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
    seminars.map(async (s: { id: string; title: string; event_date: string | null; start_time: string | null; end_time: string | null; location: string | null; capacity: number }) => {
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

      // セミナーに紐づいたタグを自動付与
      const seminarTagIds = (seminar as { tag_ids?: string[] | null }).tag_ids
      if (Array.isArray(seminarTagIds) && seminarTagIds.length > 0) {
        try {
          await supabase.from("friend_tags").upsert(
            seminarTagIds.map((tagId) => ({
              friend_id: friend.id,
              tag_id: tagId,
              auto_assigned: true,
            })),
            { onConflict: "friend_id,tag_id" }
          )
        } catch (tagError) {
          console.error("Seminar auto-tag assign error:", tagError)
        }
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

      // 決済リンク or Zoomリンクの自動送信
      const seminarExtra = seminar as Record<string, unknown>
      const paymentUrl = seminarExtra.payment_url as string | null
      const zoomUrl = seminarExtra.zoom_url as string | null
      const zoomNote = seminarExtra.zoom_note as string | null
      const seminarPrice = seminarExtra.price as number | null

      if (seminarPrice && seminarPrice > 0) {
        // 有料セミナー: Stripe Checkout Session を作成して決済リンクを送信
        try {
          const { data: stripeSettings } = await supabase
            .from("stripe_settings")
            .select("stripe_secret_key")
            .eq("organization_id", context.organizationId)
            .single()

          if (stripeSettings?.stripe_secret_key) {
            const { createStripeClient } = await import("@/lib/stripe/client")
            const stripe = createStripeClient(stripeSettings.stripe_secret_key)
            const origin = process.env.NEXT_PUBLIC_APP_URL || "https://example.com"

            const session = await stripe.checkout.sessions.create({
              payment_method_types: ["card"],
              line_items: [{
                price_data: {
                  currency: "jpy",
                  product_data: { name: seminar.title },
                  unit_amount: seminarPrice,
                },
                quantity: 1,
              }],
              mode: "payment",
              success_url: `${origin}/payment/complete?status=success`,
              cancel_url: `${origin}/payment/complete?status=cancel`,
              metadata: {
                organization_id: context.organizationId,
                friend_id: friend.id,
                seminar_id: seminar.id,
              },
            })

            // 支払いレコードを保存
            const { error: paymentInsertError } = await supabase
              .from("payments" as never)
              .insert({
                organization_id: context.organizationId,
                stripe_checkout_session_id: session.id,
                friend_id: friend.id,
                seminar_id: seminar.id,
                amount: seminarPrice,
                currency: "jpy",
                status: "pending",
                payment_type: "checkout",
                item_name: seminar.title,
              } as never)
            if (paymentInsertError) {
              console.error("Payment insert error:", paymentInsertError)
            }

            if (session.url) {
              await pushMessage(
                userId,
                [createPaymentMessage(seminar.title, session.url)],
                { accessToken: context.channelAccessToken }
              )
            }
          } else if (paymentUrl) {
            // Stripe未設定だが静的URLがある場合
            await pushMessage(
              userId,
              [createPaymentMessage(seminar.title, paymentUrl)],
              { accessToken: context.channelAccessToken }
            )
          } else {
            // Stripe未設定かつ静的URLもない場合
            console.error("No payment method configured for seminar:", seminar.id)
            await pushMessage(
              userId,
              [{ type: "text", text: "お申込みありがとうございます。お支払い方法についてはスタッフからご連絡いたしますので、しばらくお待ちください。" }],
              { accessToken: context.channelAccessToken }
            )
          }
        } catch (stripeError) {
          console.error("Stripe Checkout error:", stripeError)
          // Stripe Checkout失敗時は静的URLにフォールバック
          if (paymentUrl) {
            try {
              await pushMessage(
                userId,
                [createPaymentMessage(seminar.title, paymentUrl)],
                { accessToken: context.channelAccessToken }
              )
            } catch (fallbackError) {
              console.error("Payment fallback error:", fallbackError)
              // 最終フォールバック: テキストメッセージで決済URLを送信
              try {
                await pushMessage(
                  userId,
                  [{ type: "text", text: `お申込みありがとうございます。\nお支払いはこちらからお願いいたします。\n${paymentUrl}` }],
                  { accessToken: context.channelAccessToken }
                )
              } catch { /* ignore */ }
            }
          }
        }
      } else if (paymentUrl) {
        // 金額未設定だが静的決済URLがある場合
        try {
          await pushMessage(
            userId,
            [createPaymentMessage(seminar.title, paymentUrl)],
            { accessToken: context.channelAccessToken }
          )
        } catch {
          // フォールバック: テキストメッセージ
          try {
            await pushMessage(
              userId,
              [{ type: "text", text: `お申込みありがとうございます。\nお支払いはこちらからお願いいたします。\n${paymentUrl}` }],
              { accessToken: context.channelAccessToken }
            )
          } catch { /* ignore */ }
        }
      } else if (zoomUrl) {
        // 無料セミナー：Zoomリンクを即送信
        try {
          await pushMessage(
            userId,
            [createZoomLinkMessage(seminar.title, zoomUrl, zoomNote)],
            { accessToken: context.channelAccessToken }
          )
        } catch { /* ignore */ }
      }
      break
    }
    case "cancel_seminar": {
      const cancelSeminarId = params.get("seminar_id")
      const cancelUserId = event.source.userId
      if (!cancelSeminarId || !cancelUserId) break

      const { data: cancelFriend } = await supabase
        .from("friends")
        .select("id")
        .eq("line_user_id", cancelUserId)
        .eq("organization_id", context.organizationId)
        .single()

      if (!cancelFriend) {
        if (event.replyToken) {
          await replyMessage(
            event.replyToken,
            [{ type: "text", text: "エラーが発生しました。もう一度お試しください。" }],
            { accessToken: context.channelAccessToken }
          )
        }
        break
      }

      const { data: cancelAttendance } = await supabase
        .from("attendances")
        .select("id, status")
        .eq("friend_id", cancelFriend.id)
        .eq("seminar_id", cancelSeminarId)
        .neq("status", "cancelled")
        .single()

      if (!cancelAttendance) {
        if (event.replyToken) {
          await replyMessage(
            event.replyToken,
            [{ type: "text", text: "お申込みが見つかりませんでした。" }],
            { accessToken: context.channelAccessToken }
          )
        }
        break
      }

      await supabase
        .from("attendances")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", cancelAttendance.id)

      if (event.replyToken) {
        await replyMessage(
          event.replyToken,
          [{ type: "text", text: "お申込みをキャンセルしました。\nまたのご参加をお待ちしております。" }],
          { accessToken: context.channelAccessToken }
        )
      }
      break
    }
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
        .select("id, display_name, custom_name")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .single()

      const followupUserName = (friend as { custom_name?: string } | null)?.custom_name
        || (friend as { display_name?: string } | null)?.display_name || "お客様"

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
          [createFollowupResponseMessage(replaceMessageTags(button.responseMessage, followupUserName), button.responseUrl)],
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
          file?: { url: string; fileName?: string; mimeType?: string } | null; fileLink?: string;
          autoReplyMessage?: string;
          nextQuestionIndex?: number;
          seminarIds?: string[];
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
        .select("id, display_name, custom_name")
        .eq("organization_id", context.organizationId)
        .eq("line_user_id", userId)
        .single()

      const surveyUserName = (surveyFriend as { display_name?: string; custom_name?: string } | null)?.custom_name
        || (surveyFriend as { display_name?: string } | null)?.display_name || "お客様"

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

      // 特典の有無を判定
      // セミナーアンケート等、hasReward フラグを持たないアンケートでは undefined になる。
      // 明示的に false（トグルOFF）のときのみ特典送信を抑止する。
      const hasRewardContent = choice.rewardMessage || choice.rewardUrl || choice.file
      const hasReward = question.hasReward !== false && hasRewardContent

      // 自動返信・特典・セミナー案内・次の質問 を 1 回の reply にまとめて送信する。
      // LINE の reply API は 1 回あたり最大 5 メッセージまで送信でき、
      // 本フローで積む可能性がある最大構成（autoReply + file + reward + seminar + nextQuestion）
      // がちょうど 5 通に収まる。まとめて送ることで、
      //   - 配信順序を確定できる（特典 → 次の設問 の順で必ず表示される）
      //   - pushMessage の silent failure を避けられる
      //   - 次の設問が特典の後に必ず届く、というユーザー要件を満たせる
      const replyMessages: unknown[] = []

      // 1. 選択肢ごとの自動返信メッセージ
      if (choice.autoReplyMessage) {
        replyMessages.push({
          type: "text",
          text: replaceMessageTags(choice.autoReplyMessage, surveyUserName),
        })
      }

      // 2. 添付ファイルがある場合は画像/PDFメッセージを送信
      if (hasReward && choice.file && choice.file.url) {
        if (choice.file.mimeType?.startsWith("image/")) {
          replyMessages.push({
            type: "image",
            originalContentUrl: choice.file.url,
            previewImageUrl: choice.file.url,
          })
        } else {
          // PDF等のファイルはURLをテキストで送信
          replyMessages.push({
            type: "text",
            text: `📎 ${choice.file.fileName || "ファイル"}\n${choice.file.url}`,
          })
        }
      }

      // 3. 特典メッセージ or URL がある場合
      if (hasReward && (choice.rewardMessage || choice.rewardUrl)) {
        const rewardMsg = choice.rewardMessage
          ? replaceMessageTags(choice.rewardMessage, surveyUserName)
          : ""
        replyMessages.push(createSurveyRewardMessage(rewardMsg, choice.rewardUrl))
      }

      // 4. セミナー案内（選択肢にセミナーが紐付いている場合）
      if (choice.seminarIds && choice.seminarIds.length > 0) {
        try {
          const { data: selectedSeminars } = await supabase
            .from("seminars")
            .select("id, title, event_date, start_time, end_time, location, capacity")
            .in("id", choice.seminarIds)
            .eq("status", "open")

          if (selectedSeminars && selectedSeminars.length > 0) {
            const seminarInfos = await Promise.all(
              selectedSeminars.map(async (s: { id: string; title: string; event_date: string | null; start_time: string | null; end_time: string | null; location: string | null; capacity: number }) => {
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
            replyMessages.push(createSeminarListMessage(seminarInfos))
          }
        } catch {
          // セミナー情報取得失敗は無視
        }
      }

      // 5. 次の質問 or 完了メッセージ
      const nextQIndex = choice.nextQuestionIndex !== undefined
        ? choice.nextQuestionIndex  // 分岐指定あり（-1 = 終了）
        : qIndex + 1               // 順番通り
      if (nextQIndex >= 0 && nextQIndex < questions.length) {
        const nextQuestion = questions[nextQIndex]
        replyMessages.push(
          createSingleQuestionMessage({
            surveyId,
            surveyTitle: surveyTitle || "アンケート",
            question: nextQuestion,
            questionIndex: nextQIndex,
            totalQuestions: questions.length,
          })
        )
      } else if (replyMessages.length === 0) {
        // 全問回答完了 & 自動返信・特典・セミナーなし → お礼メッセージ
        replyMessages.push({
          type: "text",
          text: "アンケートにご回答いただきありがとうございます！全ての質問にお答えいただきました。",
        })
      }

      // まとめて送信: reply で最大 5 通、overflow は push にフォールバック
      if (replyMessages.length > 0) {
        const firstBatch = replyMessages.slice(0, 5)
        const overflow = replyMessages.slice(5)

        if (event.replyToken) {
          try {
            await replyMessage(
              event.replyToken,
              firstBatch,
              { accessToken: context.channelAccessToken }
            )
          } catch (err) {
            // reply 失敗時の push フォールバックは意図的に行わない。
            // LINE の Webhook 再配信（deliveryContext.isRedelivery）が起きたとき、
            // 再配信側の replyToken は使用済みで reply が必ず失敗するため、
            // push に fallback すると同じメッセージが二重送信される。
            // 再配信自体は handleWebhookEvent の入口で弾いているが、万が一
            // すり抜けても重複を増やさないよう、ここでのフォールバックも無効化する。
            console.error("Survey reply failed (not falling back to push to avoid duplicates):", err)
          }
        } else {
          // replyToken が無いケースはそもそも稀（LINE の postback は通常 replyToken 付き）。
          // 非 reply 経路の push は副作用の二重送信に繋がり得るため、行わない。
          console.warn("Survey postback arrived without replyToken, skipping message send to avoid duplicates")
        }

        // overflow は reply の 5 通制限を超えた分。通常は発生しないが、
        // 発生時は push で送るしかない。
        if (overflow.length > 0) {
          try {
            await pushMessage(userId, overflow, {
              accessToken: context.channelAccessToken,
            })
          } catch {
            // push失敗は無視
          }
        }
      }
      break
    }
    default:
      break
  }
}
