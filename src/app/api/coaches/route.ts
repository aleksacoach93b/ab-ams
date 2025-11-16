import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
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
        { message: 'Players are not allowed to access coaches data' },
        { status: 403 }
      )
    }

    // For staff, check if they have permission to view reports
    if (user.role === 'STAFF') {
      const staffMember = await prisma.staff.findFirst({
        where: { userId: user.userId }
      })
      
      if (!staffMember || !staffMember.canViewReports) {
        return NextResponse.json(
          { message: 'You don\'t have permission to view coaches data' },
          { status: 403 }
        )
      }
    }

    const coaches = await prisma.users.findMany({
      where: {
        role: 'COACH'
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(coaches, { status: 200 })
  } catch (error) {
    console.error('Error fetching coaches:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
