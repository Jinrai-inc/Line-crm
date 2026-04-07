import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { createOAuth2Client } from "@/lib/google/calendar"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const errorParam = searchParams.get("error")

    // Googleからのエラー（アクセス拒否、未審査アプリ等）
    if (errorParam) {
      const errorType = errorParam === "access_denied" ? "access_denied" : "google_error"
      return NextResponse.redirect(
        new URL(`/settings/google-calendar?error=${errorType}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=no_code", request.url)
      )
    }

    // Exchange code for tokens
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=no_tokens", request.url)
      )
    }

    // セッションからユーザーを取得
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error("Google callback: no authenticated user found")
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=unauthorized", request.url)
      )
    }

    const admin = createAdminClient()

    // ユーザーの組織IDを取得
    const { data: userData } = await admin
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!userData?.organization_id) {
      console.error("Google callback: user has no organization", user.id)
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=no_org", request.url)
      )
    }

    const orgId = userData.organization_id

    // Calculate token expiry
    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null

    // Upsert google_calendar_settings
    const { error } = await admin
      .from("google_calendar_settings")
      .upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expires_at: tokenExpiresAt,
          calendar_id: "primary",
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      )

    if (error) {
      console.error("Failed to save Google Calendar settings:", error)
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=save_failed", request.url)
      )
    }

    return NextResponse.redirect(
      new URL("/settings/google-calendar?success=connected", request.url)
    )
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/settings/google-calendar?error=unknown", request.url)
    )
  }
}
