-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Helper: get the current user's organization_id
-- Used in all policies below via subquery:
--   organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())

-- ============================================================
-- organizations
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select" ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "organizations_insert" ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "organizations_delete" ON organizations FOR DELETE
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- users
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON users FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete" ON users FOR DELETE
  USING (id = auth.uid());

-- ============================================================
-- line_accounts
-- ============================================================
ALTER TABLE line_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "line_accounts_select" ON line_accounts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "line_accounts_insert" ON line_accounts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "line_accounts_update" ON line_accounts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "line_accounts_delete" ON line_accounts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- friends
-- ============================================================
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends_select" ON friends FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "friends_insert" ON friends FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "friends_update" ON friends FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "friends_delete" ON friends FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- tags
-- ============================================================
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- friend_tags
-- ============================================================
ALTER TABLE friend_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friend_tags_select" ON friend_tags FOR SELECT
  USING (friend_id IN (
    SELECT id FROM friends WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "friend_tags_insert" ON friend_tags FOR INSERT
  WITH CHECK (friend_id IN (
    SELECT id FROM friends WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "friend_tags_update" ON friend_tags FOR UPDATE
  USING (friend_id IN (
    SELECT id FROM friends WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ))
  WITH CHECK (friend_id IN (
    SELECT id FROM friends WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "friend_tags_delete" ON friend_tags FOR DELETE
  USING (friend_id IN (
    SELECT id FROM friends WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

-- ============================================================
-- seminars
-- ============================================================
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seminars_select" ON seminars FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "seminars_insert" ON seminars FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "seminars_update" ON seminars FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "seminars_delete" ON seminars FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- attendances
-- ============================================================
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendances_select" ON attendances FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "attendances_insert" ON attendances FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "attendances_update" ON attendances FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "attendances_delete" ON attendances FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- broadcasts
-- ============================================================
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcasts_select" ON broadcasts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "broadcasts_insert" ON broadcasts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "broadcasts_update" ON broadcasts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "broadcasts_delete" ON broadcasts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- message_logs
-- ============================================================
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_logs_select" ON message_logs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_logs_insert" ON message_logs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_logs_update" ON message_logs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_logs_delete" ON message_logs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- members
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON members FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "members_insert" ON members FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "members_update" ON members FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "members_delete" ON members FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- omiai
-- ============================================================
ALTER TABLE omiai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omiai_select" ON omiai FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "omiai_insert" ON omiai FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "omiai_update" ON omiai FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "omiai_delete" ON omiai FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- dating
-- ============================================================
ALTER TABLE dating ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dating_select" ON dating FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "dating_insert" ON dating FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "dating_update" ON dating FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "dating_delete" ON dating FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- marriages
-- ============================================================
ALTER TABLE marriages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marriages_select" ON marriages FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marriages_insert" ON marriages FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marriages_update" ON marriages FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marriages_delete" ON marriages FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- consultations
-- ============================================================
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select" ON consultations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "consultations_insert" ON consultations FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "consultations_update" ON consultations FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "consultations_delete" ON consultations FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- coaching_bookings
-- ============================================================
ALTER TABLE coaching_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_bookings_select" ON coaching_bookings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "coaching_bookings_insert" ON coaching_bookings FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "coaching_bookings_update" ON coaching_bookings FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "coaching_bookings_delete" ON coaching_bookings FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- google_calendar_settings
-- ============================================================
ALTER TABLE google_calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_calendar_settings_select" ON google_calendar_settings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "google_calendar_settings_insert" ON google_calendar_settings FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "google_calendar_settings_update" ON google_calendar_settings FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "google_calendar_settings_delete" ON google_calendar_settings FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- message_templates
-- ============================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_templates_select" ON message_templates FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_templates_insert" ON message_templates FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_templates_update" ON message_templates FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "message_templates_delete" ON message_templates FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- payments
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- stripe_settings
-- ============================================================
ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_settings_select" ON stripe_settings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "stripe_settings_insert" ON stripe_settings FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "stripe_settings_update" ON stripe_settings FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "stripe_settings_delete" ON stripe_settings FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
