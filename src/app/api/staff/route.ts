import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET() {
  try {
    console.log('🔍 Staff fetch request received')
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      // Vraća samo staff koji je dodat od strane korisnika (iz state-a)
      return NextResponse.json(state.staff || [])
    }
    
    // Prisma handles connection pooling automatically
    const staff = await prisma.staff.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform staff data to match frontend expectations
    const transformedStaff = staff.map(staffMember => {
      return {
        id: staffMember.id,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        email: staffMember.email || '',
        role: staffMember.position || '',
        specialization: staffMember.department || '',
        imageUrl: staffMember.avatar,
        phone: staffMember.phone || '',
        dateOfBirth: staffMember.dateOfBirth?.toISOString() || null,
        experience: staffMember.experience,
        // Reports permissions
        canViewReports: staffMember.canViewReports,
        canEditReports: false, // Not in schema
        canDeleteReports: false, // Not in schema
        // Events permissions
        canCreateEvents: staffMember.canCreateEvents,
        canEditEvents: staffMember.canEditEvents,
        canDeleteEvents: staffMember.canDeleteEvents,
        // Players permissions
        canViewAllPlayers: staffMember.canViewAllPlayers,
        canEditPlayers: staffMember.canEditPlayers,
        canDeletePlayers: staffMember.canDeletePlayers,
        canAddPlayerMedia: staffMember.canAddPlayerMedia,
        canEditPlayerMedia: staffMember.canEditPlayerMedia,
        canDeletePlayerMedia: staffMember.canDeletePlayerMedia,
        canAddPlayerNotes: staffMember.canAddPlayerNotes,
        canEditPlayerNotes: staffMember.canEditPlayerNotes,
        canDeletePlayerNotes: staffMember.canDeletePlayerNotes,
        // System permissions
        canViewCalendar: staffMember.canViewCalendar,
        canViewDashboard: staffMember.canViewDashboard,
        canManageStaff: staffMember.canManageStaff,
        user: staffMember.users ? {
          id: staffMember.users.id,
          email: staffMember.users.email,
          firstName: staffMember.users.firstName,
          lastName: staffMember.users.lastName,
          lastLoginAt: staffMember.users.lastLoginAt?.toISOString(),
          createdAt: staffMember.users.createdAt.toISOString()
        } : null,
        createdAt: staffMember.createdAt.toISOString(),
        updatedAt: staffMember.updatedAt.toISOString()
      }
    })

    return NextResponse.json(transformedStaff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Staff creation request received')
    
    const body = await request.json()
    
    // Local dev mode: return mock success
    if (LOCAL_DEV_MODE) {
      const {
        firstName,
        lastName,
        name, // Fallback
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

      // Split name into firstName and lastName if needed
      const finalFirstName = firstName || (name ? name.split(' ')[0] : '')
      const finalLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : '')

      // Validate required fields
      if (!finalFirstName || !finalLastName || !email || !password) {
        return NextResponse.json(
          { message: 'First name, last name, email, and password are required' },
          { status: 400 }
        )
      }

      // Check if email already exists in state
      const state = await readState()
      const existingStaff = state.staff?.find(s => s.email.toLowerCase() === email.toLowerCase())
      if (existingStaff) {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        )
      }

      const staffId = `local-staff-${Date.now()}`
      const userId = `local-staff-user-${Date.now()}`
      const now = new Date().toISOString()
      
      const newStaff = {
        id: staffId,
        firstName: finalFirstName,
        lastName: finalLastName,
        name: `${finalFirstName} ${finalLastName}`,
        email,
        password: password, // Store password for login
        phone: phone || '',
        position: position || '',
        imageUrl: null,
        role: 'STAFF',
        // Reports permissions
        canViewReports: canViewReports || false,
        canEditReports: canEditReports || false,
        canDeleteReports: canDeleteReports || false,
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
        user: {
          id: userId,
          email,
          password: password, // Also store in user object for login
          firstName: finalFirstName,
          lastName: finalLastName,
          lastLoginAt: null,
          createdAt: now
        },
        createdAt: now,
        updatedAt: now
      }

      // Save to state
      if (!state.staff) {
        state.staff = []
      }
      state.staff.push(newStaff)
      await writeState(state)

      return NextResponse.json(newStaff, { status: 201 })
    }
    
    // Prisma handles connection pooling automatically
    console.log('📝 Request body:', body)
    
    const {
      firstName,
      lastName,
      name, // Fallback
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

    // Split name into firstName and lastName if needed
    const finalFirstName = firstName || (name ? name.split(' ')[0] : '')
    const finalLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : '')

    // Validate required fields
    console.log('🔍 Field validation:', {
      firstName: finalFirstName ? '✅' : '❌',
      lastName: finalLastName ? '✅' : '❌',
      email: email ? '✅' : '❌',
      password: password ? '✅' : '❌',
      firstNameValue: finalFirstName,
      lastNameValue: finalLastName,
      emailValue: email,
      passwordLength: password ? password.length : 0
    })

    if (!finalFirstName || !finalLastName || !email || !password) {
      console.log('❌ Validation failed: missing required fields')
      console.log('📊 Field status:', { 
        firstName: finalFirstName ? '✅' : '❌',
        lastName: finalLastName ? '✅' : '❌', 
        email: email ? '✅' : '❌', 
        password: password ? '✅' : '❌' 
      })
      return NextResponse.json(
        { message: 'First name, last name, email, and password are required' },
        { status: 400 }
      )
    }

    // Normalize email for checking
    const normalizedEmail = email.toLowerCase().trim()
    
    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      console.log('❌ Email already exists:', email)
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      )
    }

    console.log('👤 Creating user account...')
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    console.log('🔐 Password hashed, length:', hashedPassword.length)

    const userId = `staff_user_${Date.now()}`

    // Create user first
    const user = await prisma.users.create({
      data: {
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'STAFF',
        firstName: finalFirstName,
        lastName: finalLastName,
        isActive: true,
        updatedAt: new Date()
      }
    })
    console.log('✅ User created:', { id: user.id, email: user.email, role: user.role })

    console.log('👔 Creating staff record...')
    const staffId = `staff_${user.id}`
    
    // Create staff record
    const staff = await prisma.staff.create({
      data: {
        id: staffId,
        userId: user.id,
        firstName: finalFirstName,
        lastName: finalLastName,
        email: normalizedEmail,
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
    console.log('✅ Staff created:', staff.id)

    // Transform staff response to match frontend expectations
    return NextResponse.json({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      name: `${staff.firstName} ${staff.lastName}`,
      email: staff.email || '',
      role: staff.position || '',
      phone: staff.phone || '',
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
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating staff:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error.message,
        details: {
          code: (error as any)?.code,
          meta: (error as any)?.meta
        }
      },
      { status: 500 }
    )
  }
}
