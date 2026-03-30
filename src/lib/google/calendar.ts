import { google } from "googleapis"

// Create OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

// Create calendar event
export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  event: {
    summary: string
    description?: string
    startDateTime: string
    endDateTime: string
    attendeeEmails?: string[]
  }
) {
  const auth = createOAuth2Client()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: "v3", auth })

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startDateTime, timeZone: "Asia/Tokyo" },
      end: { dateTime: event.endDateTime, timeZone: "Asia/Tokyo" },
      attendees: event.attendeeEmails?.map((email) => ({ email })),
    },
  })
  return res.data
}

// Delete calendar event
export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string
) {
  const auth = createOAuth2Client()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: "v3", auth })
  await calendar.events.delete({ calendarId: "primary", eventId })
}

// List calendar events
export async function listCalendarEvents(
  accessToken: string,
  refreshToken: string,
  timeMin: string,
  timeMax: string
) {
  const auth = createOAuth2Client()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: "v3", auth })

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  })
  return res.data.items || []
}
