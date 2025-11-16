import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    // Only coaches and admins can delete reports
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if report exists
    const existingReport = await prisma.playersReport.findUnique({
      where: { id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { message: 'Report not found' },
        { status: 404 }
      )
    }

    // Delete the report (cascade will handle related records)
    await prisma.playersReport.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Report deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting player report:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
