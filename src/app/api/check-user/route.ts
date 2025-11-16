import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'aleksacoach@gmail.com' }
    })
    
    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          passwordHash: user.password ? 'Set' : 'Not set',
          createdAt: user.createdAt
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      })
    }
    
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
