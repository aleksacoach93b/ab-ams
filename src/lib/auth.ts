import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Verify JWT token AND check if user still exists in database
 * This prevents deleted users from accessing the system
 */
export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    // First verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string; email: string; role: string }
    
    // CRITICAL: Check if user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    })
    
    // If user doesn't exist or is inactive, token is invalid
    if (!user || !user.isActive) {
      console.log('🚫 [AUTH] User not found or inactive:', { userId: decoded.userId, email: decoded.email })
      return null
    }
    
    // Return user data from database (not from token) to ensure consistency
    return {
      userId: user.id,
      email: user.email,
      role: user.role
    }
  } catch (error) {
    console.log('🚫 [AUTH] Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' })
}