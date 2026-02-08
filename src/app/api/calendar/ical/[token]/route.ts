import { NextRequest, NextResponse } from 'next/server'
import { calendarService } from '@/services/calendar.service'

// GET /api/calendar/ical/[token] - публичный iCal feed
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const icalContent = await calendarService.generateICalFeed(params.token)

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка при генерации календаря' },
      { status: 500 }
    )
  }
}
