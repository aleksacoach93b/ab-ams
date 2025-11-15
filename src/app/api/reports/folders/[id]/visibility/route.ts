import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

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

    const body = await request.json()
    const { visibility } = body

    if (!Array.isArray(visibility)) {
      return NextResponse.json(
        { message: 'Visibility must be an array' },
        { status: 400 }
      )
    }

    // LOCAL_DEV_MODE: Update visibility in state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find folder in all reportFolders keys
      let folder = null
      let folderKey = null
      
      for (const key of Object.keys(state.reportFolders)) {
        const found = state.reportFolders[key].find((f: any) => f.id === id)
        if (found) {
          folder = found
          folderKey = key
          break
        }
      }
      
      if (!folder) {
        return NextResponse.json(
          { message: 'Folder not found' },
          { status: 404 }
        )
      }

      // Map visibility array to visibleToStaff format
      const visibleToStaff = visibility.map((v: any) => {
        // Find staff by userId
        const staffMember = state.staff?.find((s: any) => 
          s.user?.id === v.userId || s.id === v.userId
        )
        
        if (!staffMember) {
          console.warn(`⚠️ Staff not found for userId: ${v.userId}`)
          return null
        }
        
        return {
          id: `access-${id}-${staffMember.id}`,
          canView: v.canView || false,
          canEdit: v.canEdit || false,
          canDelete: v.canDelete || false,
          staffId: staffMember.id,
          userId: v.userId,
          staff: {
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email || staffMember.user?.email
          }
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)

      // Update folder's visibleToStaff
      folder.visibleToStaff = visibleToStaff
      folder.updatedAt = new Date().toISOString()

      // Save updated folder back to state
      const folderIndex = state.reportFolders[folderKey!].findIndex((f: any) => f.id === id)
      if (folderIndex !== -1) {
        state.reportFolders[folderKey!][folderIndex] = folder
        await writeState(state)
        console.log(`✅ Updated folder visibility in LOCAL_DEV_MODE: ${visibleToStaff.length} staff members`)
      }

      return NextResponse.json({ message: 'Visibility updated successfully' })
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
      // Delete existing visibility records
      await prisma.reportFolderVisibility.deleteMany({
        where: { folderId: id }
      })

      // Create new visibility records
      if (visibility && visibility.length > 0) {
        const visibilityData = visibility.map((v: any) => ({
          folderId: id,
          userId: v.userId,
          canView: v.canView || false,
          canEdit: v.canEdit || false,
          canDelete: v.canDelete || false
        }))

        await prisma.reportFolderVisibility.createMany({
          data: visibilityData
        })
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
