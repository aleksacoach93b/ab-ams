import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' })
}