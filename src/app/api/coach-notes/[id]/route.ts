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

    // Only ADMIN can update coach notes
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, isPinned, staffAccess } = body

    // Local dev mode
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const noteIndex = state.coachNotes?.findIndex((n: any) => n.id === id)
      
      if (noteIndex === undefined || noteIndex === -1) {
        return NextResponse.json(
          { message: 'Note not found' },
          { status: 404 }
        )
      }

      // Update note
      if (title !== undefined) state.coachNotes[noteIndex].title = title
      if (content !== undefined) state.coachNotes[noteIndex].content = content
      if (isPinned !== undefined) state.coachNotes[noteIndex].isPinned = isPinned
      state.coachNotes[noteIndex].updatedAt = new Date().toISOString()

      // Update staff access
      if (staffAccess && Array.isArray(staffAccess)) {
        const visibleToStaff = staffAccess
          .filter((access: any) => access.canView)
          .map((access: any) => {
            const staffMember = state.staff?.find((s: any) => s.id === access.staffId)
            if (!staffMember) return null
            
            return {
              id: `access-${id}-${staffMember.id}`,
              staffId: staffMember.id,
              canView: true,
              staff: {
                id: staffMember.id,
                name: staffMember.name || `${staffMember.firstName} ${staffMember.lastName}`.trim(),
                email: staffMember.email || staffMember.user?.email
              }
            }
          })
          .filter((item: any) => item !== null)
        
        state.coachNotes[noteIndex].visibleToStaff = visibleToStaff
      }

      await writeState(state)

      return NextResponse.json(state.coachNotes[noteIndex])
    }

    // Production mode: use database
    // Check if note exists
    const existingNote = await prisma.coach_notes.findUnique({
      where: { id }
    })

    if (!existingNote) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      )
    }

    // Update the note and handle staff access
    console.log('📝 [COACH NOTES PUT] Updating note:', id)
    console.log('📝 [COACH NOTES PUT] Staff access data:', JSON.stringify(staffAccess, null, 2))
    
    const updatedNote = await prisma.$transaction(async (tx) => {
      // Update the note
      const note = await tx.coach_notes.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(isPinned !== undefined && { isPinned }),
          updatedAt: new Date()
        }
      })

      // Delete existing staff access records
      await tx.coach_note_staff_access.deleteMany({
        where: { noteId: id }
      })

      // Create new staff access records if provided
      if (staffAccess && Array.isArray(staffAccess)) {
        const accessRecords = []
        
        for (const access of staffAccess) {
          if (access.canView && access.staffId) {
            // Verify staff exists
            const staffExists = await tx.staff.findUnique({
              where: { id: access.staffId }
            })
            
            if (!staffExists) {
              console.warn(`⚠️ [COACH NOTES PUT] Staff member not found: ${access.staffId}`)
              continue
            }
            
            // Generate unique ID for access record
            const accessId = `access_${id}_${access.staffId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            accessRecords.push({
              id: accessId,
              noteId: id,
              staffId: access.staffId,
              canView: true
            })
          }
        }

        console.log(`📝 [COACH NOTES PUT] Creating ${accessRecords.length} staff access records`)

        if (accessRecords.length > 0) {
          // Use individual creates to avoid potential unique constraint issues
          for (const record of accessRecords) {
            try {
              await tx.coach_note_staff_access.create({
                data: record
              })
            } catch (error) {
              console.error(`❌ [COACH NOTES PUT] Error creating access record:`, error)
              // Continue with other records
            }
          }
        }
      }

      // Return the updated note with relations
      return await tx.coach_notes.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          coach_note_staff_access: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      })
    })

    // Transform for frontend
    const transformedNote = {
      id: updatedNote!.id,
      title: updatedNote!.title,
      content: updatedNote!.content,
      isPinned: updatedNote!.isPinned,
      authorId: updatedNote!.authorId,
      createdAt: updatedNote!.createdAt.toISOString(),
      updatedAt: updatedNote!.updatedAt.toISOString(),
      author: updatedNote!.users ? {
        id: updatedNote!.users.id,
        name: `${updatedNote!.users.firstName} ${updatedNote!.users.lastName}`.trim(),
        email: updatedNote!.users.email,
        role: updatedNote!.users.role
      } : null,
      visibleToStaff: updatedNote!.coach_note_staff_access.map(access => ({
        id: access.id,
        staffId: access.staffId,
        canView: access.canView,
        staff: access.staff ? {
          id: access.staff.id,
          name: `${access.staff.firstName} ${access.staff.lastName}`.trim(),
          email: access.staff.email
        } : null
      }))
    }

    console.log('✅ [COACH NOTES PUT] Note updated successfully')
    return NextResponse.json(transformedNote)
  } catch (error) {
    console.error('❌ [COACH NOTES PUT] Error updating coach note:', error)
    console.error('❌ [COACH NOTES PUT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only ADMIN can delete coach notes
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Local dev mode
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const noteIndex = state.coachNotes?.findIndex((n: any) => n.id === id)
      
      if (noteIndex === undefined || noteIndex === -1) {
        return NextResponse.json(
          { message: 'Note not found' },
          { status: 404 }
        )
      }

      state.coachNotes.splice(noteIndex, 1)
      await writeState(state)

      return NextResponse.json({ message: 'Note deleted successfully' })
    }

    // Production mode: use database
    // Check if note exists
    const note = await prisma.coach_notes.findUnique({
      where: { id }
    })

    if (!note) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      )
    }

    // Check if user is the author or admin
    if (user.role !== 'ADMIN' && note.authorId !== user.userId) {
      return NextResponse.json(
        { message: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Delete the note (cascade will handle related records)
    await prisma.coach_notes.delete({
      where: { id }
    })

    console.log('✅ Coach note deleted successfully:', id)

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting coach note:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
