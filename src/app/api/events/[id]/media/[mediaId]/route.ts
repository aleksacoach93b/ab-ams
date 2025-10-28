import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id: eventId, mediaId } = await params

    if (!eventId || !mediaId) {
      return NextResponse.json(
        { message: 'Event ID and Media ID are required' },
        { status: 400 }
      )
    }

    // Check authentication and permissions
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

    // Check if user has permission to delete media
    if (user.role === 'PLAYER') {
      return NextResponse.json(
        { message: 'Players are not allowed to delete event media' },
        { status: 403 }
      )
    }

    // For staff, check if they have event management permissions
    if (user.role === 'STAFF') {
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.id },
        select: { canDeleteEvents: true }
      })
      
      if (!staffMember?.canDeleteEvents) {
        return NextResponse.json(
          { message: 'Insufficient permissions to delete event media' },
          { status: 403 }
        )
      }
    }

    // Get media record to find file path
    const media = await prisma.eventMedia.findUnique({
      where: { id: mediaId },
    })

    if (!media) {
      return NextResponse.json(
        { message: 'Media not found' },
        { status: 404 }
      )
    }

    // Verify the media belongs to the event
    if (media.eventId !== eventId) {
      return NextResponse.json(
        { message: 'Media does not belong to this event' },
        { status: 403 }
      )
    }

    // Delete media record from database
    await prisma.eventMedia.delete({
      where: { id: mediaId },
    })

    // Delete the file from disk
    try {
      const filePath = join(process.cwd(), 'public', media.url)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (fileError) {
      console.error('Error deleting media file:', fileError)
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({
      message: 'Media deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting event media:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
