import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get client information for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Log failed login attempt
      await prisma.loginLog.create({
        data: {
          userId: '', // No user ID for invalid email
          email: email,
          role: 'PLAYER', // Default role
          ipAddress: ipAddress,
          userAgent: userAgent,
          success: false,
          failureReason: 'Invalid email'
        }
      }).catch(() => {}) // Ignore errors for logging
      
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      // Log failed login attempt for inactive account
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          email: user.email,
          role: user.role,
          ipAddress: ipAddress,
          userAgent: userAgent,
          success: false,
          failureReason: 'Account deactivated'
        }
      }).catch(() => {}) // Ignore errors for logging
      
      return NextResponse.json(
        { message: 'Account is deactivated' },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password || '')
    
    if (!isValidPassword) {
      // Log failed login attempt for invalid password
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          email: user.email,
          role: user.role,
          ipAddress: ipAddress,
          userAgent: userAgent,
          success: false,
          failureReason: 'Invalid password'
        }
      }).catch(() => {}) // Ignore errors for logging
      
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginIp: ipAddress,
        userAgent: userAgent
      }
    })

    // Create login log entry
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: ipAddress,
        userAgent: userAgent,
        success: true
      }
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
      user: userWithoutPassword,
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
