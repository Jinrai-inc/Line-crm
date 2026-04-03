import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedOrgId } from "@/lib/api/auth"
import { createAdminClient } from "@/lib/supabase/server"
import { createOAuth2Client } from "@/lib/google/calendar"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

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

    // Get authenticated user and organization
    const auth = await getAuthenticatedOrgId()
    if (!auth.ok) {
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=unauthorized", request.url)
      )
    }
    const { orgId } = auth
    const admin = createAdminClient()

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
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expires_at: tokenExpiresAt,
          calendar_id: "primary",
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" }
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
