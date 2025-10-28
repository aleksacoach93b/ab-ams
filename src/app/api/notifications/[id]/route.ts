import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await context.params
    const { isRead } = await request.json()

    // Check if notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        isRead,
        ...(isRead && { readAt: new Date() })
      }
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await context.params

    // Check if notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
