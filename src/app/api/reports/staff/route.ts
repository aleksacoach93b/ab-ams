import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    // Only admins can view staff list
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    if (LOCAL_DEV_MODE) {
      // Read staff from local state
      const state = await readState()
      const staff = (state.staff || []).map(staffMember => ({
        id: staffMember.id,
        name: staffMember.name || `${staffMember.firstName} ${staffMember.lastName}`,
        email: staffMember.email,
        user: {
          id: staffMember.user?.id || '',
          name: `${staffMember.firstName} ${staffMember.lastName}`,
          email: staffMember.user?.email || staffMember.email,
          role: 'STAFF' // Staff members always have STAFF role
        }
      })).sort((a, b) => a.name.localeCompare(b.name))

      console.log(`✅ LOCAL_DEV_MODE: Returning ${staff.length} staff members`)
      return NextResponse.json({ staff })
    }

    // Get all staff members from database
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

    return NextResponse.json({ staff })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}