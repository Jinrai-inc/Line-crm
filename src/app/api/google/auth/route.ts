import { NextRequest, NextResponse } from "next/server"
import { createOAuth2Client } from "@/lib/google/calendar"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const loginHint = searchParams.get("login_hint") || undefined

  const oauth2Client = createOAuth2Client()
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    prompt: "consent",
    login_hint: loginHint,
  })
  return NextResponse.redirect(authUrl)
}
