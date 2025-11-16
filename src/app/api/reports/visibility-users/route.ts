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
        { message: 'Players are not allowed to access reports visibility' },
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
          { message: 'You don\'t have permission to access reports visibility' },
          { status: 403 }
        )
      }
    }

    // Get all staff members with user information
    const staff = await prisma.staff.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get all coaches (users with COACH role)
    const coaches = await prisma.users.findMany({
      where: {
        role: 'COACH'
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data to a consistent format
    const allUsers = []

    // Add staff members
    staff.forEach(staffMember => {
      const userName = staffMember.user?.name || staffMember.name || `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() || staffMember.user?.email || staffMember.email || 'Unknown Staff'
      allUsers.push({
        id: staffMember.userId, // Use the userId for foreign key constraint
        name: userName,
        email: staffMember.user?.email || staffMember.email,
        role: 'STAFF',
        userId: staffMember.userId
      })
    })

    // Add coaches
    coaches.forEach(coach => {
      const userName = coach.name || `${coach.firstName || ''} ${coach.lastName || ''}`.trim() || coach.email || 'Unknown Coach'
      allUsers.push({
        id: coach.id,
        name: userName,
        email: coach.email,
        role: 'COACH',
        userId: coach.id
      })
    })

    console.log('=== VISIBILITY USERS API DEBUG ===')
    console.log('Returning users:', JSON.stringify(allUsers, null, 2))
    
    return NextResponse.json({ users: allUsers })
  } catch (error) {
    console.error('Error fetching visibility users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
