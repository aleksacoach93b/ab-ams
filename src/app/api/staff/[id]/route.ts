import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Local dev mode: return from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffMember = state.staff?.find(s => s.id === id)
      
      if (staffMember) {
        return NextResponse.json(staffMember)
      }
      
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      }
    })

    if (!staff) {
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Transform staff response
    return NextResponse.json({
      id: staff.id,
      userId: staff.userId, // Add userId explicitly
      firstName: staff.firstName,
      lastName: staff.lastName,
      name: `${staff.firstName} ${staff.lastName}`,
      email: staff.email || '',
      phone: staff.phone || '',
      position: staff.position || '',
      imageUrl: staff.avatar,
      // Reports permissions
      canViewReports: staff.canViewReports,
      canEditReports: false,
      canDeleteReports: false,
      // Events permissions
      canCreateEvents: staff.canCreateEvents,
      canEditEvents: staff.canEditEvents,
      canDeleteEvents: staff.canDeleteEvents,
      // Players permissions
      canViewAllPlayers: staff.canViewAllPlayers,
      canEditPlayers: staff.canEditPlayers,
      canDeletePlayers: staff.canDeletePlayers,
      canAddPlayerMedia: staff.canAddPlayerMedia,
      canEditPlayerMedia: staff.canEditPlayerMedia,
      canDeletePlayerMedia: staff.canDeletePlayerMedia,
      canAddPlayerNotes: staff.canAddPlayerNotes,
      canEditPlayerNotes: staff.canEditPlayerNotes,
      canDeletePlayerNotes: staff.canDeletePlayerNotes,
      // System permissions
      canViewCalendar: staff.canViewCalendar,
      canViewDashboard: staff.canViewDashboard,
      canManageStaff: staff.canManageStaff,
      user: staff.users ? {
        id: staff.users.id,
        email: staff.users.email,
        firstName: staff.users.firstName,
        lastName: staff.users.lastName,
        lastLoginAt: staff.users.lastLoginAt?.toISOString(),
        createdAt: staff.users.createdAt.toISOString()
      } : null,
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      firstName,
      lastName,
      name, // Fallback if firstName/lastName not provided
      email,
      password,
      phone,
      position,
      // Reports permissions
      canViewReports,
      canEditReports,
      canDeleteReports,
      // Events permissions
      canCreateEvents,
      canEditEvents,
      canDeleteEvents,
      // Players permissions
      canViewAllPlayers,
      canEditPlayers,
      canDeletePlayers,
      canAddPlayerMedia,
      canEditPlayerMedia,
      canDeletePlayerMedia,
      canAddPlayerNotes,
      canEditPlayerNotes,
      canDeletePlayerNotes,
      // System permissions
      canViewCalendar,
      canViewDashboard,
      canManageStaff
    } = body

    // Local dev mode: update in state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffIndex = state.staff?.findIndex(s => s.id === id)
      
      if (staffIndex === undefined || staffIndex === -1) {
        return NextResponse.json(
          { message: 'Staff member not found' },
          { status: 404 }
        )
      }

      const existingStaff = state.staff[staffIndex]
      const finalFirstName = firstName || (name ? name.split(' ')[0] : existingStaff.firstName)
      const finalLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : existingStaff.lastName)
      
      const updatedStaff = {
        ...existingStaff,
        firstName: finalFirstName,
        lastName: finalLastName,
        name: `${finalFirstName} ${finalLastName}`,
        email: email || existingStaff.email,
        password: password || existingStaff.password || '', // Update password if provided, keep existing if not
        phone: phone || existingStaff.phone || '',
        position: position || existingStaff.position || '',
        canViewReports: canViewReports !== undefined ? canViewReports : existingStaff.canViewReports,
        canEditReports: canEditReports !== undefined ? canEditReports : existingStaff.canEditReports,
        canDeleteReports: canDeleteReports !== undefined ? canDeleteReports : existingStaff.canDeleteReports,
        canCreateEvents: canCreateEvents !== undefined ? canCreateEvents : existingStaff.canCreateEvents,
        canEditEvents: canEditEvents !== undefined ? canEditEvents : existingStaff.canEditEvents,
        canDeleteEvents: canDeleteEvents !== undefined ? canDeleteEvents : existingStaff.canDeleteEvents,
        canViewAllPlayers: canViewAllPlayers !== undefined ? canViewAllPlayers : existingStaff.canViewAllPlayers,
        canEditPlayers: canEditPlayers !== undefined ? canEditPlayers : existingStaff.canEditPlayers,
        canDeletePlayers: canDeletePlayers !== undefined ? canDeletePlayers : existingStaff.canDeletePlayers,
        canAddPlayerMedia: canAddPlayerMedia !== undefined ? canAddPlayerMedia : existingStaff.canAddPlayerMedia,
        canEditPlayerMedia: canEditPlayerMedia !== undefined ? canEditPlayerMedia : existingStaff.canEditPlayerMedia,
        canDeletePlayerMedia: canDeletePlayerMedia !== undefined ? canDeletePlayerMedia : existingStaff.canDeletePlayerMedia,
        canAddPlayerNotes: canAddPlayerNotes !== undefined ? canAddPlayerNotes : existingStaff.canAddPlayerNotes,
        canEditPlayerNotes: canEditPlayerNotes !== undefined ? canEditPlayerNotes : existingStaff.canEditPlayerNotes,
        canDeletePlayerNotes: canDeletePlayerNotes !== undefined ? canDeletePlayerNotes : existingStaff.canDeletePlayerNotes,
        canViewCalendar: canViewCalendar !== undefined ? canViewCalendar : existingStaff.canViewCalendar,
        canViewDashboard: canViewDashboard !== undefined ? canViewDashboard : existingStaff.canViewDashboard,
        canManageStaff: canManageStaff !== undefined ? canManageStaff : existingStaff.canManageStaff,
        user: {
          ...existingStaff.user,
          email: email || existingStaff.email,
          password: password || existingStaff.user?.password || '', // Update password in user object too
          firstName: finalFirstName,
          lastName: finalLastName
        },
        updatedAt: new Date().toISOString()
      }

      state.staff[staffIndex] = updatedStaff
      await writeState(state)

      return NextResponse.json(updatedStaff)
    }

    // Get existing staff member
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: { users: true }
    })

    if (!existingStaff) {
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Split name into firstName and lastName if needed
    const finalFirstName = firstName || (name ? name.split(' ')[0] : existingStaff.firstName)
    const finalLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : existingStaff.lastName)

    // Update user data
    const userUpdateData: any = {
      email,
      firstName: finalFirstName,
      lastName: finalLastName,
      updatedAt: new Date()
    }

    // Update password if provided
    if (password && password.trim() !== '') {
      userUpdateData.password = await hashPassword(password)
    }

    await prisma.user.update({
      where: { id: existingStaff.userId },
      data: userUpdateData
    })

    // Update staff data
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        firstName: finalFirstName,
        lastName: finalLastName,
        email,
        phone: phone || null,
        position: position || null,
        // Reports permissions
        canViewReports: canViewReports || false,
        // Events permissions
        canCreateEvents: canCreateEvents || false,
        canEditEvents: canEditEvents || false,
        canDeleteEvents: canDeleteEvents || false,
        // Players permissions
        canViewAllPlayers: canViewAllPlayers || false,
        canEditPlayers: canEditPlayers || false,
        canDeletePlayers: canDeletePlayers || false,
        canAddPlayerMedia: canAddPlayerMedia || false,
        canEditPlayerMedia: canEditPlayerMedia || false,
        canDeletePlayerMedia: canDeletePlayerMedia || false,
        canAddPlayerNotes: canAddPlayerNotes || false,
        canEditPlayerNotes: canEditPlayerNotes || false,
        canDeletePlayerNotes: canDeletePlayerNotes || false,
        // System permissions
        canViewCalendar: canViewCalendar || false,
        canViewDashboard: canViewDashboard || false,
        canManageStaff: canManageStaff || false,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      }
    })

    // Transform staff response
    return NextResponse.json({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      name: `${staff.firstName} ${staff.lastName}`,
      email: staff.email || '',
      phone: staff.phone || '',
      position: staff.position || '',
      imageUrl: staff.avatar,
      canViewReports: staff.canViewReports,
      canEditReports: false,
      canDeleteReports: false,
      canCreateEvents: staff.canCreateEvents,
      canEditEvents: staff.canEditEvents,
      canDeleteEvents: staff.canDeleteEvents,
      canViewAllPlayers: staff.canViewAllPlayers,
      canEditPlayers: staff.canEditPlayers,
      canDeletePlayers: staff.canDeletePlayers,
      canAddPlayerMedia: staff.canAddPlayerMedia,
      canEditPlayerMedia: staff.canEditPlayerMedia,
      canDeletePlayerMedia: staff.canDeletePlayerMedia,
      canAddPlayerNotes: staff.canAddPlayerNotes,
      canEditPlayerNotes: staff.canEditPlayerNotes,
      canDeletePlayerNotes: staff.canDeletePlayerNotes,
      canViewCalendar: staff.canViewCalendar,
      canViewDashboard: staff.canViewDashboard,
      canManageStaff: staff.canManageStaff,
      user: staff.users ? {
        id: staff.users.id,
        email: staff.users.email,
        firstName: staff.users.firstName,
        lastName: staff.users.lastName,
        lastLoginAt: staff.users.lastLoginAt?.toISOString(),
        createdAt: staff.users.createdAt.toISOString()
      } : null,
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Local dev mode: delete from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const staffIndex = state.staff?.findIndex(s => s.id === id)
      
      if (staffIndex === undefined || staffIndex === -1) {
        return NextResponse.json(
          { message: 'Staff member not found' },
          { status: 404 }
        )
      }

      state.staff.splice(staffIndex, 1)
      await writeState(state)

      return NextResponse.json({ message: 'Staff member deleted successfully' })
    }

    // Get staff member to find user ID
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { users: true }
    })

    if (!staff) {
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // CRITICAL SECURITY: Delete both staff AND user to prevent login
    // Use transaction to ensure both are deleted atomically
    await prisma.$transaction(async (tx) => {
      // First delete staff record
      await tx.staff.delete({
        where: { id }
      })
      console.log('✅ Staff record deleted:', id)
      
      // Then delete user record (this prevents login)
      if (staff.userId) {
        try {
          const deletedUser = await tx.users.delete({
            where: { id: staff.userId }
          })
          console.log('✅ User record deleted:', { userId: staff.userId, email: deletedUser.email })
        } catch (error: any) {
          // If user was already deleted or doesn't exist, log but don't fail
          console.log('⚠️ User already deleted or not found:', staff.userId, error.message)
        }
      } else {
        console.warn('⚠️ Staff has no userId:', id)
      }
    })

    // VERIFY: Double-check that user is actually deleted
    if (staff.userId) {
      const verifyUser = await prisma.user.findUnique({
        where: { id: staff.userId }
      })
      if (verifyUser) {
        console.error('🚨 CRITICAL: User still exists after deletion!', { userId: staff.userId, email: verifyUser.email })
        // Force delete again
        await prisma.user.delete({
          where: { id: staff.userId }
        })
        console.log('✅ Force deleted user:', staff.userId)
      } else {
        console.log('✅ Verified: User successfully deleted from database')
      }
    }

    console.log('✅ Staff member and user deleted successfully:', { staffId: id, userId: staff.userId })

    return NextResponse.json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
