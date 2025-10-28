import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        user: true,
        team: true
      }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const {
      name,
      email,
      password,
      phone,
      dateOfBirth,
      position,
      jerseyNumber,
      status
    } = body

    // First, get the player to find the associated user
    const existingPlayer = await prisma.player.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Update user password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { message: 'Password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      await prisma.user.update({
        where: { id: existingPlayer.userId },
        data: {
          password: await hashPassword(password)
        }
      })
    }

    // Update player data
    const player = await prisma.player.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        position,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        status
      },
      include: {
        user: true,
        team: true
      }
    })

    // Create notification if status changed
    if (status && status !== existingPlayer.status) {
      try {
        await NotificationService.notifyPlayerStatusChanged(
          id,
          name || existingPlayer.name,
          status
        )
      } catch (notificationError) {
        console.error('Error creating player status notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params

    console.log('🗑️ Attempting to delete player:', playerId)

    if (!playerId) {
      console.log('❌ No player ID provided')
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    // First check if player exists using Prisma
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { user: true }
    })

    if (!player) {
      console.log('❌ Player not found:', playerId)
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    console.log('✅ Found player:', player.name, 'User ID:', player.userId)

    // Delete related records first (due to foreign key constraints)
    try {
      // Delete player media files
      await prisma.playerMedia.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted player media files')

      // Delete player notes
      await prisma.playerNote.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted player notes')

      // Delete event participants
      await prisma.eventParticipant.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted event participants')
    } catch (relatedError) {
      console.log('⚠️ Warning: Some related records could not be deleted:', relatedError)
      // Continue with player deletion even if some related records fail
    }

    // Delete the player record
    await prisma.player.delete({
      where: { id: playerId }
    })
    console.log('✅ Deleted player record')

    // Delete the associated user record if it exists
    if (player.userId) {
      await prisma.user.delete({
        where: { id: player.userId }
      })
      console.log('✅ Deleted user record')
    }

    console.log('🎉 Successfully deleted player:', playerId)

    return NextResponse.json(
      { message: 'Player deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('💥 Error deleting player:', error)
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to delete player', 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      },
      { status: 500 }
    )
  }
}
