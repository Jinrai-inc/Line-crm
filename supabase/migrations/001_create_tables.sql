-- ============================================================
-- LINE CRM Database Schema
-- ============================================================

-- organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  product_tour_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- line_accounts
CREATE TABLE line_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_secret TEXT NOT NULL,
  channel_access_token TEXT NOT NULL,
  webhook_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- friends (LINE友だち)
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  line_account_id UUID REFERENCES line_accounts(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  custom_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  memo TEXT,
  first_added_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, line_user_id)
);
CREATE INDEX idx_friends_org ON friends(organization_id);
CREATE INDEX idx_friends_status ON friends(organization_id, status);
CREATE INDEX idx_friends_line_user ON friends(line_user_id);

-- tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- friend_tags
CREATE TABLE friend_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friend_id UUID REFERENCES friends(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  auto_assigned BOOLEAN DEFAULT false,
  UNIQUE(friend_id, tag_id)
);

-- seminars
CREATE TABLE seminars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  location_url TEXT,
  capacity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  registration_deadline TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_seminars_org ON seminars(organization_id);
CREATE INDEX idx_seminars_date ON seminars(organization_id, event_date);

-- attendances
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES friends(id) ON DELETE CASCADE,
  seminar_id UUID REFERENCES seminars(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  memo TEXT,
  UNIQUE(friend_id, seminar_id)
);
CREATE INDEX idx_attendances_seminar ON attendances(seminar_id);
CREATE INDEX idx_attendances_friend ON attendances(friend_id);

-- broadcasts
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  line_account_id UUID REFERENCES line_accounts(id),
  title TEXT,
  message_text TEXT NOT NULL,
  target_type TEXT DEFAULT 'all',
  target_filter JSONB,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- message_logs
CREATE TABLE message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES friends(id) ON DELETE SET NULL,
  line_user_id TEXT,
  event_type TEXT NOT NULL,
  message_type TEXT,
  content TEXT,
  raw_event JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_logs_org ON message_logs(organization_id);
CREATE INDEX idx_logs_friend ON message_logs(friend_id);
CREATE INDEX idx_logs_created ON message_logs(created_at);

-- members (婚活スクール会員)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES friends(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  birth_date DATE,
  age INTEGER,
  occupation TEXT,
  company_type TEXT,
  income_range TEXT,
  education TEXT,
  height INTEGER,
  area TEXT,
  smoking TEXT DEFAULT '吸わない',
  drinking TEXT DEFAULT 'たしなむ程度',
  hobby TEXT,
  self_introduction TEXT,
  photo_urls JSONB DEFAULT '[]',
  ideal_age_min INTEGER,
  ideal_age_max INTEGER,
  ideal_income TEXT,
  ideal_education TEXT,
  ideal_area TEXT,
  ideal_other TEXT,
  status TEXT DEFAULT 'active',
  membership_plan TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  pause_start_date DATE,
  pause_end_date DATE,
  withdraw_date DATE,
  withdraw_reason TEXT,
  counselor_id UUID REFERENCES users(id),
  counselor_memo TEXT,
  activity_pace TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_members_org ON members(organization_id);
CREATE INDEX idx_members_status ON members(organization_id, status);
CREATE INDEX idx_members_gender ON members(organization_id, gender);
CREATE INDEX idx_members_friend ON members(friend_id);

-- omiai (お見合い)
CREATE TABLE omiai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  male_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  female_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  location TEXT,
  location_url TEXT,
  status TEXT DEFAULT 'pending',
  male_result TEXT,
  female_result TEXT,
  match_result TEXT,
  male_feedback TEXT,
  female_feedback TEXT,
  counselor_note TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  result_request_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_omiai_org ON omiai(organization_id);
CREATE INDEX idx_omiai_date ON omiai(scheduled_date);
CREATE INDEX idx_omiai_male ON omiai(male_member_id);
CREATE INDEX idx_omiai_female ON omiai(female_member_id);

-- dating (交際管理)
CREATE TABLE dating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  omiai_id UUID REFERENCES omiai(id),
  male_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  female_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'dating',
  started_at DATE DEFAULT CURRENT_DATE,
  serious_at DATE,
  engaged_at DATE,
  broken_up_at DATE,
  break_reason TEXT,
  date_count INTEGER DEFAULT 0,
  counselor_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- marriages (成婚記録)
CREATE TABLE marriages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  dating_id UUID REFERENCES dating(id),
  male_member_id UUID REFERENCES members(id),
  female_member_id UUID REFERENCES members(id),
  married_date DATE,
  wedding_date DATE,
  story TEXT,
  permission_to_publish BOOLEAN DEFAULT false,
  days_to_marriage INTEGER,
  omiai_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- consultations (コーチング記録)
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES users(id),
  consultation_date DATE NOT NULL,
  consultation_type TEXT NOT NULL,
  duration_minutes INTEGER,
  summary TEXT NOT NULL,
  action_items TEXT,
  next_consultation_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_consultations_member ON consultations(member_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);

-- coaching_bookings (コーチング予約)
CREATE TABLE coaching_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES users(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available',
  booking_type TEXT,
  booking_source TEXT DEFAULT 'admin',
  booked_at TIMESTAMPTZ,
  member_message TEXT,
  google_event_id TEXT,
  google_calendar_synced BOOLEAN DEFAULT false,
  block_reason TEXT,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookings_org ON coaching_bookings(organization_id);
CREATE INDEX idx_bookings_date ON coaching_bookings(booking_date);
CREATE INDEX idx_bookings_coach ON coaching_bookings(coach_id);
CREATE INDEX idx_bookings_member ON coaching_bookings(member_id);
CREATE INDEX idx_bookings_status ON coaching_bookings(organization_id, status);
CREATE INDEX idx_bookings_google ON coaching_bookings(google_event_id);

-- google_calendar_settings
CREATE TABLE google_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  available_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',
  available_start_time TIME DEFAULT '10:00',
  available_end_time TIME DEFAULT '17:00',
  slot_duration_minutes INTEGER DEFAULT 60,
  buffer_minutes INTEGER DEFAULT 0,
  max_bookings_per_day INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- message_templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  auto_send BOOLEAN DEFAULT false,
  auto_send_trigger TEXT,
  auto_send_timing TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES friends(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  seminar_id UUID REFERENCES seminars(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES coaching_bookings(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  payment_link_sent BOOLEAN DEFAULT false,
  payment_link_sent_at TIMESTAMPTZ,
  completion_notified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_status ON payments(organization_id, status);
CREATE INDEX idx_payments_type ON payments(organization_id, payment_type);
CREATE INDEX idx_payments_stripe ON payments(stripe_checkout_session_id);
CREATE INDEX idx_payments_friend ON payments(friend_id);
CREATE INDEX idx_payments_member ON payments(member_id);

-- stripe_settings
CREATE TABLE stripe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  stripe_publishable_key TEXT,
  stripe_secret_key TEXT,
  stripe_webhook_secret TEXT,
  default_coaching_price INTEGER DEFAULT 15000,
  auto_send_payment_link BOOLEAN DEFAULT true,
  send_receipt_via_line BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);
