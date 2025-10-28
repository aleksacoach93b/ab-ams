import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
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

    // Check permissions - only coaches, admins, and staff with permission can access
    if (user.role === 'PLAYER') {
      return NextResponse.json(
        { message: 'Players are not allowed to manage folder visibility' },
        { status: 403 }
      )
    }

    // For staff, check if they have permission to edit reports
    if (user.role === 'STAFF') {
      const staffMember = await prisma.staff.findFirst({
        where: { userId: user.userId }
      })
      
      if (!staffMember || !staffMember.canEditReports) {
        return NextResponse.json(
          { message: 'You don\'t have permission to manage folder visibility' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { visibility } = body

    console.log('=== FOLDER VISIBILITY DEBUG ===')
    console.log('Folder ID:', id)
    console.log('Received visibility:', JSON.stringify(visibility, null, 2))

    if (!Array.isArray(visibility)) {
      return NextResponse.json(
        { message: 'Visibility must be an array' },
        { status: 400 }
      )
    }

    // Check if folder exists
    const folder = await prisma.reportFolder.findUnique({
      where: { id }
    })

    if (!folder) {
      return NextResponse.json(
        { message: 'Folder not found' },
        { status: 404 }
      )
    }

    // Update visibility using transaction
    try {
      console.log('Starting transaction...')
      
      // Delete existing visibility records
      console.log('Deleting existing visibility records for folder:', id)
      await prisma.reportFolderVisibility.deleteMany({
        where: { folderId: id }
      })

      // Create new visibility records
      if (visibility && visibility.length > 0) {
        console.log('Creating new visibility records...')
        const visibilityData = visibility.map((v: any) => ({
          folderId: id,
          userId: v.userId,
          canView: v.canView || false,
          canEdit: v.canEdit || false,
          canDelete: v.canDelete || false
        }))

        console.log('Visibility data to create:', JSON.stringify(visibilityData, null, 2))

        await prisma.reportFolderVisibility.createMany({
          data: visibilityData
        })
        console.log('Successfully created visibility records')
      } else {
        console.log('No visibility records to create (empty array)')
      }
    } catch (transactionError) {
      console.error('Transaction error:', transactionError)
      throw transactionError
    }

    return NextResponse.json({ message: 'Visibility updated successfully' })
  } catch (error) {
    console.error('Error updating folder visibility:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
