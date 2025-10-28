import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/teams/[id]/staff - Assign staff to a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Staff assignment request received for team:', params.id)
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { staffIds } = body

    if (!staffIds || !Array.isArray(staffIds)) {
      console.log('❌ Validation failed: staffIds array is required')
      return NextResponse.json(
        { message: 'Staff IDs array is required' },
        { status: 400 }
      )
    }

    console.log('📅 Assigning staff to team:', {
      teamId: params.id,
      staffIds
    })

    // Update staff to assign them to the team
    const updatedStaff = await prisma.staff.updateMany({
      where: {
        id: {
          in: staffIds
        }
      },
      data: {
        teamId: params.id
      }
    })

    console.log('✅ Staff assigned successfully:', updatedStaff.count)

    return NextResponse.json({
      message: `${updatedStaff.count} staff members assigned to team`,
      updatedCount: updatedStaff.count
    })
  } catch (error) {
    console.error('❌ Error assigning staff to team:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to assign staff to team', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id]/staff - Remove staff from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Staff removal request received for team:', params.id)
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { staffIds } = body

    if (!staffIds || !Array.isArray(staffIds)) {
      console.log('❌ Validation failed: staffIds array is required')
      return NextResponse.json(
        { message: 'Staff IDs array is required' },
        { status: 400 }
      )
    }

    console.log('📅 Removing staff from team:', {
      teamId: params.id,
      staffIds
    })

    // Remove staff from the team by setting teamId to null
    const updatedStaff = await prisma.staff.updateMany({
      where: {
        id: {
          in: staffIds
        },
        teamId: params.id
      },
      data: {
        teamId: null
      }
    })

    console.log('✅ Staff removed successfully:', updatedStaff.count)

    return NextResponse.json({
      message: `${updatedStaff.count} staff members removed from team`,
      updatedCount: updatedStaff.count
    })
  } catch (error) {
    console.error('❌ Error removing staff from team:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to remove staff from team', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
