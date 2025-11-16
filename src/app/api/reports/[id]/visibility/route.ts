import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PUT(
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

    // Check permissions - only coaches, admins, and staff with permission can access
    if (user.role === 'PLAYER') {
      return NextResponse.json(
        { message: 'Players are not allowed to manage report visibility' },
        { status: 403 }
      )
    }

    // For staff, check if they have permission to edit reports
    if (user.role === 'STAFF') {
      const staffMember = await prisma.staff.findFirst({
        where: { userId: user.userId }
      })
      
      if (!staffMember || !staffMember.canEditReports) {
        return NextResponse.json(
          { message: 'You don\'t have permission to manage report visibility' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { visibility } = body


    if (!Array.isArray(visibility)) {
      return NextResponse.json(
        { message: 'Visibility must be an array' },
        { status: 400 }
      )
    }

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

    // Update visibility using transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing visibility records
      await tx.reportVisibility.deleteMany({
        where: { reportId: id }
      })

      // Create new visibility records
      const visibilityData = visibility
        .filter((v: any) => v.canView || v.canEdit || v.canDelete)
        .map((v: any) => ({
          reportId: id,
          userId: v.userId,
          canView: v.canView || false,
          canEdit: v.canEdit || false,
          canDelete: v.canDelete || false
        }))

      if (visibilityData.length > 0) {
        await tx.reportVisibility.createMany({
          data: visibilityData
        })
      }
    })

    return NextResponse.json({ message: 'Visibility updated successfully' })
  } catch (error) {
    console.error('Error updating report visibility:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
