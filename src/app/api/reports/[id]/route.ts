import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Only admins and coaches can delete reports
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Local dev mode
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const reportIndex = state.reports?.findIndex((r: any) => r.id === id)
      
      if (reportIndex === undefined || reportIndex === -1) {
        return NextResponse.json(
          { message: 'Report not found' },
          { status: 404 }
        )
      }

      state.reports.splice(reportIndex, 1)
      await writeState(state)

      return NextResponse.json({ message: 'Report deleted successfully' })
    }

    // Production mode: use database
    // Check if report exists
    const report = await prisma.reports.findUnique({
      where: { id }
    })

    if (!report) {
      return NextResponse.json(
        { message: 'Report not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator or admin
    if (user.role !== 'ADMIN' && report.createdBy !== user.userId) {
      return NextResponse.json(
        { message: 'You can only delete your own reports' },
        { status: 403 }
      )
    }

    // Delete the report (cascade will handle related records)
    await prisma.reports.delete({
      where: { id }
    })

    console.log('✅ Report deleted successfully:', id)

    return NextResponse.json({ message: 'Report deleted successfully' })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

