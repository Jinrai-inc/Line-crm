// ============================================================
// Marriage Module Type Definitions
// ============================================================

import type { Json } from './database';

// --------------------------------------------------
// Status Unions (enum-like)
// --------------------------------------------------

export type MemberStatus =
  | 'active'      // 活動中
  | 'paused'      // 休会中
  | 'withdrawn'   // 退会
  | 'graduated';  // 成婚退会

export type MemberGender =
  | 'male'   // 男性
  | 'female'; // 女性

export type OmiaiStatus =
  | 'pending'    // 調整中
  | 'confirmed'  // 確定
  | 'completed'  // 実施済み
  | 'cancelled'; // キャンセル

export type OmiaiResult =
  | 'like'       // 交際希望
  | 'pass'       // お見送り
  | 'pending';   // 保留

export type MatchResult =
  | 'matched'       // 両想い（交際成立）
  | 'male_only'     // 男性のみ希望
  | 'female_only'   // 女性のみ希望
  | 'no_match'      // 不成立
  | 'pending';      // 結果待ち

export type DatingStatus =
  | 'dating'      // 仮交際
  | 'serious'     // 真剣交際
  | 'engaged'     // 婚約
  | 'married'     // 成婚
  | 'broken_up';  // 破局

export type ConsultationType =
  | 'initial'      // 初回面談
  | 'regular'      // 定期面談
  | 'strategy'     // 活動戦略
  | 'pre_omiai'    // お見合い前
  | 'post_omiai'   // お見合い後
  | 'dating_check' // 交際フォロー
  | 'emergency'    // 緊急相談
  | 'other';       // その他

export type BookingStatus =
  | 'available'   // 予約可能
  | 'booked'      // 予約済み
  | 'completed'   // 完了
  | 'cancelled'   // キャンセル
  | 'blocked';    // ブロック（予約不可）

export type BookingType =
  | 'initial'   // 初回面談
  | 'regular'   // 定期面談
  | 'strategy'  // 戦略面談
  | 'emergency' // 緊急
  | 'other';    // その他

export type BookingSource =
  | 'admin'    // 管理者が作成
  | 'member';  // 会員がLINEから予約

export type MembershipPlan =
  | 'trial'     // お試し
  | 'basic'     // ベーシック
  | 'standard'  // スタンダード
  | 'premium';  // プレミアム

export type IncomeRange =
  | '~300万'
  | '300~400万'
  | '400~500万'
  | '500~600万'
  | '600~800万'
  | '800~1000万'
  | '1000~1500万'
  | '1500万~';

export type Education =
  | '高校卒'
  | '専門学校卒'
  | '短大卒'
  | '大学卒'
  | '大学院卒';

export type SmokingStatus =
  | '吸わない'
  | 'たまに吸う'
  | '吸う';

export type DrinkingStatus =
  | '飲まない'
  | 'たしなむ程度'
  | '飲む';

export type DayOfWeek =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

// --------------------------------------------------
// Member Types
// --------------------------------------------------

export interface MemberProfile {
  id: string;
  organization_id: string | null;
  friend_id: string | null;
  name: string;
  gender: MemberGender;
  birth_date: string | null;
  age: number | null;
  occupation: string | null;
  company_type: string | null;
  income_range: IncomeRange | string | null;
  education: Education | string | null;
  height: number | null;
  area: string | null;
  smoking: SmokingStatus;
  drinking: DrinkingStatus;
  hobby: string | null;
  self_introduction: string | null;
  photo_urls: string[];
  ideal_age_min: number | null;
  ideal_age_max: number | null;
  ideal_income: string | null;
  ideal_education: string | null;
  ideal_area: string | null;
  ideal_other: string | null;
  status: MemberStatus;
  membership_plan: MembershipPlan | string | null;
  join_date: string;
  pause_start_date: string | null;
  pause_end_date: string | null;
  withdraw_date: string | null;
  withdraw_reason: string | null;
  counselor_id: string | null;
  counselor_memo: string | null;
  activity_pace: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberWithFriend extends MemberProfile {
  friend?: {
    display_name: string | null;
    picture_url: string | null;
    line_user_id: string;
  } | null;
}

// --------------------------------------------------
// Omiai Types
// --------------------------------------------------

export interface OmiaiRecord {
  id: string;
  organization_id: string | null;
  male_member_id: string | null;
  female_member_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  location: string | null;
  location_url: string | null;
  status: OmiaiStatus;
  male_result: OmiaiResult | null;
  female_result: OmiaiResult | null;
  match_result: MatchResult | null;
  male_feedback: string | null;
  female_feedback: string | null;
  counselor_note: string | null;
  reminder_sent: boolean;
  result_request_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface OmiaiWithMembers extends OmiaiRecord {
  male_member: MemberProfile;
  female_member: MemberProfile;
}

// --------------------------------------------------
// Dating Types
// --------------------------------------------------

export interface DatingRecord {
  id: string;
  organization_id: string | null;
  omiai_id: string | null;
  male_member_id: string | null;
  female_member_id: string | null;
  status: DatingStatus;
  started_at: string;
  serious_at: string | null;
  engaged_at: string | null;
  broken_up_at: string | null;
  break_reason: string | null;
  date_count: number;
  counselor_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatingWithMembers extends DatingRecord {
  male_member: MemberProfile;
  female_member: MemberProfile;
  omiai?: OmiaiRecord | null;
}

// --------------------------------------------------
// Marriage Types
// --------------------------------------------------

export interface MarriageRecord {
  id: string;
  organization_id: string | null;
  dating_id: string | null;
  male_member_id: string | null;
  female_member_id: string | null;
  married_date: string | null;
  wedding_date: string | null;
  story: string | null;
  permission_to_publish: boolean;
  days_to_marriage: number | null;
  omiai_count: number | null;
  created_at: string;
}

export interface MarriageWithMembers extends MarriageRecord {
  male_member: MemberProfile;
  female_member: MemberProfile;
  dating?: DatingRecord | null;
}

// --------------------------------------------------
// Consultation Types
// --------------------------------------------------

export interface ConsultationRecord {
  id: string;
  organization_id: string | null;
  member_id: string | null;
  counselor_id: string | null;
  consultation_date: string;
  consultation_type: ConsultationType;
  duration_minutes: number | null;
  summary: string;
  action_items: string | null;
  next_consultation_date: string | null;
  created_at: string;
}

export interface ConsultationWithRelations extends ConsultationRecord {
  member: MemberProfile;
  counselor?: {
    id: string;
    display_name: string | null;
    email: string;
  } | null;
}

// --------------------------------------------------
// Coaching Booking Types
// --------------------------------------------------

export interface CoachingBooking {
  id: string;
  organization_id: string | null;
  member_id: string | null;
  coach_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  booking_type: BookingType | string | null;
  booking_source: BookingSource;
  booked_at: string | null;
  member_message: string | null;
  google_event_id: string | null;
  google_calendar_synced: boolean;
  block_reason: string | null;
  consultation_id: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachingBookingWithRelations extends CoachingBooking {
  member?: MemberProfile | null;
  coach?: {
    id: string;
    display_name: string | null;
    email: string;
  } | null;
  consultation?: ConsultationRecord | null;
}

// --------------------------------------------------
// Google Calendar Settings
// --------------------------------------------------

export interface GoogleCalendarSettings {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  calendar_id: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  available_days: DayOfWeek[];
  available_start_time: string;
  available_end_time: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  max_bookings_per_day: number;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------
// Time Slot (computed, not stored)
// --------------------------------------------------

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  booking_id?: string;
}

// --------------------------------------------------
// Dashboard / Statistics Types
// --------------------------------------------------

export interface MarriageDashboardStats {
  total_members: number;
  active_members: number;
  male_members: number;
  female_members: number;
  pending_omiai: number;
  active_dating: number;
  total_marriages: number;
  monthly_omiai_count: number;
  monthly_marriage_count: number;
  average_days_to_marriage: number | null;
}

export interface MemberActivitySummary {
  member_id: string;
  member_name: string;
  gender: MemberGender;
  status: MemberStatus;
  total_omiai: number;
  active_dating: number;
  last_omiai_date: string | null;
  last_consultation_date: string | null;
  next_booking_date: string | null;
  days_since_join: number;
}
