import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const newPassword = 'Teodor06022025'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const updatedUser = await prisma.users.update({
      where: { email: 'aleksacoach@gmail.com' },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Admin password updated successfully',
      email: updatedUser.email
    })
    
  } catch (error) {
    console.error('Error updating admin password:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
