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

    // Only ADMIN can see all staff for access control
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // LOCAL_DEV_MODE: Return staff from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffList = (state.staff || []).map((s: any) => ({
        id: s.id,
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        email: s.email || s.user?.email,
        user: {
          id: s.user?.id || s.id,
          name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          email: s.email || s.user?.email,
          role: s.role || 'STAFF'
        }
      }))

      return NextResponse.json({ staff: staffList })
    }

    // Fetch all staff members
    const staffMembers = await prisma.staff.findMany({
      where: {
        isActive: true
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    const staffList = staffMembers.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      email: s.email || s.users?.email || '',
      user: s.users ? {
        id: s.users.id,
        name: `${s.users.firstName} ${s.users.lastName}`.trim(),
        email: s.users.email,
        role: s.users.role
      } : null
    }))

    return NextResponse.json({ staff: staffList })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
