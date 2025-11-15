import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const wellnessUrl = 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv'
    
    const response = await fetch(wellnessUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
      cache: 'no-store', // Don't cache to always get fresh data
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch wellness data', status: response.status },
        { status: response.status }
      )
    }

    const csvText = await response.text()
    
    return new NextResponse(csvText, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error fetching wellness CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

