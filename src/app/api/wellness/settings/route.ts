import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'
import { prisma } from '@/lib/prisma'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COACH')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    if (LOCAL_DEV_MODE) {
      const state = await readState()
      return NextResponse.json({
        wellnessSettings: state.wellnessSettings || {
          csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
          surveyId: 'cmg6klyig0004l704u1kd78zb',
          baseUrl: 'https://wellness-monitor-tan.vercel.app'
        }
      })
    }

    // Production mode - would use database
    return NextResponse.json({
      wellnessSettings: {
        csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
        surveyId: 'cmg6klyig0004l704u1kd78zb',
        baseUrl: 'https://wellness-monitor-tan.vercel.app'
      }
    })
  } catch (error) {
    console.error('Error fetching wellness settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only admins can update wellness settings' }, { status: 403 })
    }

    const { wellnessSettings } = await request.json()

    if (!wellnessSettings || typeof wellnessSettings !== 'object') {
      return NextResponse.json({ message: 'Invalid wellness settings' }, { status: 400 })
    }

    if (LOCAL_DEV_MODE) {
      const state = await readState()
      state.wellnessSettings = {
        csvUrl: wellnessSettings.csvUrl || state.wellnessSettings.csvUrl,
        surveyId: wellnessSettings.surveyId || state.wellnessSettings.surveyId,
        baseUrl: wellnessSettings.baseUrl || state.wellnessSettings.baseUrl
      }
      await writeState(state)
      
      console.log('✅ Wellness settings updated:', state.wellnessSettings)
      
      return NextResponse.json({
        message: 'Wellness settings updated successfully',
        wellnessSettings: state.wellnessSettings
      })
    }

    // Production mode - would use database
    return NextResponse.json({
      message: 'Wellness settings updated successfully',
      wellnessSettings
    })
  } catch (error) {
    console.error('Error updating wellness settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

