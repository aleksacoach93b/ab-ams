import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notificationService'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id || !body.status) {
      return NextResponse.json(
        { message: 'Player ID and status are required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating player ${id} availabilityStatus to: ${body.status}`)
    
    // Get player info before update for notification
    const playerBefore = await prisma.player.findUnique({
      where: { id },
      select: { name: true, availabilityStatus: true }
    })
    
    // Update the availabilityStatus field instead of status
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { availabilityStatus: body.status },
      select: {
        id: true,
        name: true,
        availabilityStatus: true,
        status: true
      }
    })

    console.log(`✅ Successfully updated player ${id} availabilityStatus to: ${body.status}`)

    // Create notification for player status change
    if (playerBefore && playerBefore.availabilityStatus !== body.status) {
      try {
        await NotificationService.notifyPlayerStatusChanged(
          id,
          playerBefore.name || 'Unknown Player',
          body.status
        )
        console.log(`📢 Created notification for player ${id} status change`)
      } catch (notificationError) {
        console.error('Error creating player status notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({
      message: 'Player status updated successfully',
      playerId: id,
      status: body.status,
      player: updatedPlayer
    })

  } catch (error) {
    console.error('Error updating player status:', error)
    return NextResponse.json(
      { message: 'Failed to update player status', error: error.message },
      { status: 500 }
    )
  }
}
