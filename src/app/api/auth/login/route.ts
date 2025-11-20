import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readState, initializePlayerUsers } from '@/lib/localDevStore'
import { NotificationService } from '@/lib/notificationService'
import { UAParser } from 'ua-parser-js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL
const FALLBACK_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'admin@localhost.com'
const FALLBACK_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'admin1234'
const DEFAULT_PLAYER_PASSWORD = 'player123' // Default password for players in LOCAL_DEV_MODE

// Helper function to get location from IP address
async function getLocationFromIP(ipAddress: string): Promise<string | null> {
  try {
    // Skip for localhost or unknown IPs
    if (!ipAddress || ipAddress === 'unknown' || ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress === '::1') {
      return null
    }
    
    // Use ip-api.com free service (no API key required, 45 requests/minute limit)
    // Request more fields for better accuracy: city, district, region, country, zip, lat, lon
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,city,district,regionName,country,countryCode,zip,lat,lon`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.status === 'success') {
      // Build precise location string with all available details
      const parts = []
      
      // Add district (most specific area) if available
      if (data.district && data.district.trim()) {
        parts.push(data.district.trim())
      }
      
      // Add city if available and different from district
      if (data.city && data.city.trim()) {
        const city = data.city.trim()
        if (!parts.includes(city)) {
          parts.push(city)
        }
      }
      
      // Add region/state if available and different from city
      if (data.regionName && data.regionName.trim()) {
        const region = data.regionName.trim()
        if (!parts.includes(region) && region !== data.city) {
          parts.push(region)
        }
      }
      
      // Add postal code if available (for more precision)
      if (data.zip && data.zip.trim()) {
        parts.push(`(${data.zip.trim()})`)
      }
      
      // Add country at the end
      if (data.country && data.country.trim()) {
        parts.push(data.country.trim())
      }
      
      // Return formatted location string
      if (parts.length > 0) {
        return parts.join(', ')
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching location from IP:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get client information for tracking
    const ipAddressRaw = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown'
    // Extract first IP if multiple (x-forwarded-for can contain multiple IPs)
    const ipAddress = ipAddressRaw.split(',')[0].trim()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Parse device information from user-agent
    const parser = new UAParser(userAgent)
    const deviceInfo = parser.getDevice()
    const osInfo = parser.getOS()
    const browserInfo = parser.getBrowser()
    
    // Build device string: "Device Brand Model - OS - Browser"
    let deviceString = ''
    const deviceParts = []
    
    // Add device type and model
    if (deviceInfo.type) {
      // Mobile, tablet, etc.
      if (deviceInfo.vendor && deviceInfo.model) {
        deviceParts.push(`${deviceInfo.vendor} ${deviceInfo.model}`)
      } else if (deviceInfo.model) {
        deviceParts.push(deviceInfo.model)
      } else {
        deviceParts.push(deviceInfo.type)
      }
    } else {
      // Desktop - use OS as device indicator
      if (osInfo.name) {
        deviceParts.push(osInfo.name)
        if (osInfo.version) {
          deviceParts.push(osInfo.version)
        }
      } else {
        deviceParts.push('Desktop')
      }
    }
    
    // Add OS info if available and different from device
    if (osInfo.name && !deviceParts.some(p => p.includes(osInfo.name))) {
      if (osInfo.version) {
        deviceParts.push(`${osInfo.name} ${osInfo.version}`)
      } else {
        deviceParts.push(osInfo.name)
      }
    }
    
    // Add browser info
    if (browserInfo.name) {
      if (browserInfo.version) {
        deviceParts.push(`${browserInfo.name} ${browserInfo.version}`)
      } else {
        deviceParts.push(browserInfo.name)
      }
    }
    
    deviceString = deviceParts.join(' - ') || 'Unknown Device'

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
        lastLoginAt: new Date()
      }
    })

    // Get location from IP (wait a bit for async call, but don't block too long)
    let location: string | null = null
    try {
      location = await getLocationFromIP(ipAddress)
    } catch (error) {
      console.error('Error getting location:', error)
    }
    
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
          location: location,
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
          // Get location for notification (try again if not already fetched)
          let locationForNotification = location
          if (!locationForNotification) {
            try {
              locationForNotification = await getLocationFromIP(ipAddress)
            } catch (error) {
              console.error('Error getting location for notification:', error)
            }
          }
          const locationText = locationForNotification ? `, ${locationForNotification}` : ''
          const deviceText = deviceString ? ` using ${deviceString}` : ''
          await NotificationService.createNotification({
            title: 'User Login Detected',
            message: `${userName} (${user.email}) logged in from ${ipAddress}${locationText}${deviceText}`,
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
