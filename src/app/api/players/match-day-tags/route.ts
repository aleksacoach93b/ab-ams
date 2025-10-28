import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, matchDayTag } = body;

    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json({ message: 'Player IDs array is required' }, { status: 400 });
    }

    // Update match day tags for all specified players
    const updatedPlayers = await prisma.player.updateMany({
      where: {
        id: {
          in: playerIds
        }
      },
      data: {
        matchDayTag: matchDayTag === '' ? null : matchDayTag
      }
    });

    console.log(`✅ Updated match day tags for ${updatedPlayers.count} players`);

    return NextResponse.json({ 
      message: 'Match day tags updated successfully', 
      updatedCount: updatedPlayers.count 
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating match day tags:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, matchDayTag } = body;

    if (!playerId) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }

    // Update match day tag for single player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { matchDayTag: matchDayTag === '' ? null : matchDayTag }
    });

    console.log(`✅ Updated match day tag for player ${updatedPlayer.name}`);

    return NextResponse.json({ 
      message: 'Match day tag updated successfully', 
      player: updatedPlayer 
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating match day tag:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
