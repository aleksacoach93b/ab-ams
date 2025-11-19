import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readState, initializePlayerUsers } from '@/lib/localDevStore'
import { NotificationService } from '@/lib/notificationService'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
const FALLBACK_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'admin@localhost.com'
const FALLBACK_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'admin1234'
const DEFAULT_PLAYER_PASSWORD = 'player123' // Default password for players in LOCAL_DEV_MODE

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get client information for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Local development fallback (no DB required)
    if (LOCAL_DEV_MODE) {
      const emailLower = email.toLowerCase()
      
      // Check for coach account
      if (emailLower === 'aleksacoach@gmail.com' && password === 'Teodor2025') {
        const token = jwt.sign(
          { userId: 'coach_user_001', email: 'aleksacoach@gmail.com', role: 'ADMIN' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: 'coach_user_001',
            email: 'aleksacoach@gmail.com',
            role: 'ADMIN',
            firstName: 'Aleksa',
            lastName: 'Coach',
            name: 'Aleksa Coach',
            isActive: true
          },
          token
        })
      }
      
      // Check for player accounts - initialize if needed
      await initializePlayerUsers() // Ensure player users are initialized
      const state = await readState()
      
      // Check for player users
      const playerUser = state.playerUsers?.find(u => u.email.toLowerCase() === emailLower)
      
      if (playerUser) {
        // For LOCAL_DEV_MODE, use simple password comparison (since passwords are stored plain for dev)
        // In production, passwords should be hashed
        const isPasswordValid = playerUser.password === password || password === DEFAULT_PLAYER_PASSWORD
        
        if (!isPasswordValid) {
          return NextResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          )
        }

        if (!playerUser.isActive) {
          return NextResponse.json(
            { message: 'Account is deactivated' },
            { status: 401 }
          )
        }

        const token = jwt.sign(
          { userId: playerUser.id, email: playerUser.email, role: 'PLAYER' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: playerUser.id,
            email: playerUser.email,
            role: 'PLAYER',
            firstName: playerUser.firstName,
            lastName: playerUser.lastName,
            name: `${playerUser.firstName} ${playerUser.lastName}`,
            isActive: true,
            playerId: playerUser.playerId
          },
          token
        })
      }
      
      // Check for staff accounts
      const staff = state.staff?.find((s: any) => {
        const staffEmail = s.email?.toLowerCase() || s.user?.email?.toLowerCase()
        return staffEmail === emailLower
      })
      
      if (staff) {
        // Check password - staff.password or staff.user?.password
        const staffPassword = staff.password || staff.user?.password
        const isPasswordValid = staffPassword === password
        
        if (!isPasswordValid) {
          return NextResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          )
        }

        // Get staff user ID - prefer staff.user?.id, fallback to staff.id
        const staffUserId = staff.user?.id || staff.id
        const staffEmail = staff.email || staff.user?.email || emailLower
        const staffName = staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staffEmail
        const nameParts = staffName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const token = jwt.sign(
          { userId: staffUserId, email: staffEmail, role: staff.role || 'STAFF' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: staffUserId,
            email: staffEmail,
            role: staff.role || 'STAFF',
            firstName,
            lastName,
            name: staffName,
            isActive: true,
            staffId: staff.id
          },
          token
        })
      }
      
      // Check for fallback admin
      const ok = emailLower === FALLBACK_ADMIN_EMAIL.toLowerCase() && password === FALLBACK_ADMIN_PASSWORD
      if (!ok) {
        return NextResponse.json(
          { message: 'Invalid email or password' },
          { status: 401 }
        )
      }

      const token = jwt.sign(
        { userId: 'local-admin', email: FALLBACK_ADMIN_EMAIL, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      return NextResponse.json({
        message: 'Login successful (local mode)',
        user: {
          id: 'local-admin',
          email: FALLBACK_ADMIN_EMAIL,
          role: 'ADMIN',
          firstName: 'Local',
          lastName: 'Admin',
          name: 'Local Admin',
          isActive: true
        },
        token
      })
    }

    // Try DB auth; on failure, fall back to local admin
    let user: any = null
    try {
      const normalizedEmail = email.toLowerCase().trim()
      console.log('🔍 Looking for user with email:', normalizedEmail)
      
      user = await prisma.users.findUnique({
        where: { email: normalizedEmail }
      })
      
      console.log('🔍 User found:', user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password
      } : 'NOT FOUND')
    } catch (dbError) {
      console.error('❌ Database error during login:', dbError)
      // Fallback path if Prisma is not configured locally
      const emailLower = email.toLowerCase()
      
      // Check for coach account
      if (emailLower === 'aleksacoach@gmail.com' && password === 'Teodor2025') {
        const token = jwt.sign(
          { userId: 'coach_user_001', email: 'aleksacoach@gmail.com', role: 'ADMIN' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )
        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: 'coach_user_001',
            email: 'aleksacoach@gmail.com',
            role: 'ADMIN',
            firstName: 'Aleksa',
            lastName: 'Coach',
            name: 'Aleksa Coach',
            isActive: true
          },
          token
        })
      }
      
      // Check for player accounts - initialize if needed
      await initializePlayerUsers() // Ensure player users are initialized
      const state = await readState()
      
      // Check for player users
      const playerUser = state.playerUsers?.find(u => u.email.toLowerCase() === emailLower)
      
      if (playerUser) {
        const isPasswordValid = playerUser.password === password || password === DEFAULT_PLAYER_PASSWORD
        
        if (!isPasswordValid) {
          return NextResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          )
        }

        if (!playerUser.isActive) {
          return NextResponse.json(
            { message: 'Account is deactivated' },
            { status: 401 }
          )
        }

        const token = jwt.sign(
          { userId: playerUser.id, email: playerUser.email, role: 'PLAYER' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: playerUser.id,
            email: playerUser.email,
            role: 'PLAYER',
            firstName: playerUser.firstName,
            lastName: playerUser.lastName,
            name: `${playerUser.firstName} ${playerUser.lastName}`,
            isActive: true,
            playerId: playerUser.playerId
          },
          token
        })
      }
      
      // Check for staff accounts
      const staff = state.staff?.find((s: any) => {
        const staffEmail = s.email?.toLowerCase() || s.user?.email?.toLowerCase()
        return staffEmail === emailLower
      })
      
      if (staff) {
        // Check password - staff.password or staff.user?.password
        const staffPassword = staff.password || staff.user?.password
        const isPasswordValid = staffPassword === password
        
        if (!isPasswordValid) {
          return NextResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          )
        }

        // Get staff user ID - prefer staff.user?.id, fallback to staff.id
        const staffUserId = staff.user?.id || staff.id
        const staffEmail = staff.email || staff.user?.email || emailLower
        const staffName = staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staffEmail
        const nameParts = staffName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const token = jwt.sign(
          { userId: staffUserId, email: staffEmail, role: staff.role || 'STAFF' },
          JWT_SECRET,
          { expiresIn: '24h' }
        )

        return NextResponse.json({
          message: 'Login successful (local mode)',
          user: {
            id: staffUserId,
            email: staffEmail,
            role: staff.role || 'STAFF',
            firstName,
            lastName,
            name: staffName,
            isActive: true,
            staffId: staff.id
          },
          token
        })
      }
      
      // Check for fallback admin
      const ok = emailLower === FALLBACK_ADMIN_EMAIL.toLowerCase() && password === FALLBACK_ADMIN_PASSWORD
      if (!ok) {
        return NextResponse.json(
          { message: 'Invalid email or password' },
          { status: 401 }
        )
      }
      const token = jwt.sign(
        { userId: 'local-admin', email: FALLBACK_ADMIN_EMAIL, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '24h' }
      )
      return NextResponse.json({
        message: 'Login successful (local mode)',
        user: {
          id: 'local-admin',
          email: FALLBACK_ADMIN_EMAIL,
          role: 'ADMIN',
          firstName: 'Local',
          lastName: 'Admin',
          name: 'Local Admin',
          isActive: true
        },
        token
      })
    }

    if (!user) {
      console.log('❌ User not found for email:', email.toLowerCase().trim())
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      console.log('❌ User account is deactivated:', user.id)
      return NextResponse.json(
        { message: 'Account is deactivated' },
        { status: 401 }
      )
    }

    // Check password
    if (!user.password) {
      console.log('❌ User has no password set:', user.id)
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    console.log('🔐 Comparing password...')
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.id)
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    console.log('✅ Password valid for user:', user.id)

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginIp: ipAddress
      }
    })

    // Create login log
    try {
      await prisma.login_logs.create({
        data: {
          id: `login_${Date.now()}_${user.id}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          avatar: user.avatar || null,
          ipAddress: ipAddress,
          userAgent: userAgent,
          success: true
        }
      })
    } catch (logError) {
      console.error('Error creating login log:', logError)
      // Don't fail login if log creation fails
    }

    // Notify admin about login (async, don't block response)
    Promise.resolve().then(async () => {
      try {
        // Get all admin users
        const admins = await prisma.users.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true }
        })
        
        if (admins.length > 0) {
          const userName = user.name || `${user.firstName} ${user.lastName}`.trim() || user.email
          await NotificationService.createNotification({
            title: 'User Login Detected',
            message: `${userName} (${user.email}) logged in from ${ipAddress}`,
            type: 'GENERAL',
            category: 'SYSTEM',
            userIds: admins.map(a => a.id)
          })
        }
      } catch (notificationError) {
        console.error('Error creating login notification:', notificationError)
        // Don't fail login if notification fails
      }
    }).catch(err => {
      console.error('Promise error in login notification:', err)
    })

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Login successful',
      user: {
        ...userWithoutPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName} ${user.lastName}`
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    )
  }
}
