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

    // Only coaches and admins can update coach notes
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, isPinned, staffAccess } = body

    // LOCAL_DEV_MODE: Update note in state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find note
      const noteIndex = (state.coachNotes || []).findIndex((n: any) => n.id === id)
      
      if (noteIndex === -1) {
        return NextResponse.json(
          { message: 'Note not found' },
          { status: 404 }
        )
      }

      const existingNote = state.coachNotes[noteIndex]

      // Check permission
      if (existingNote.authorId !== user.userId && user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You can only edit your own notes' },
          { status: 403 }
        )
      }

      // Map staffAccess to visibleToStaff format
      const visibleToStaff = (staffAccess && Array.isArray(staffAccess) ? staffAccess : []).map((access: any) => {
        // Find staff by userId or staffId
        const staffMember = state.staff?.find((s: any) => 
          s.id === access.staffId || 
          s.user?.id === access.userId ||
          (access.staffId && s.id === access.staffId)
        )
        
        if (!staffMember) {
          console.warn(`⚠️ Staff not found for access:`, access)
          return null
        }
        
        return {
          id: `access-${id}-${staffMember.id}`,
          staffId: staffMember.id,
          canView: access.canView !== undefined ? access.canView : true,
          staff: {
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email || staffMember.user?.email
          }
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)

      // Update note
      const updatedNote = {
        ...existingNote,
        title,
        content,
        isPinned: isPinned !== undefined ? isPinned : existingNote.isPinned,
        visibleToStaff,
        updatedAt: new Date().toISOString()
      }

      state.coachNotes[noteIndex] = updatedNote
      await writeState(state)

      // Find author for response
      const author = state.staff?.find((s: any) => s.user?.id === updatedNote.authorId) || null

      const transformedNote = {
        id: updatedNote.id,
        title: updatedNote.title,
        content: updatedNote.content,
        isPinned: updatedNote.isPinned,
        authorId: updatedNote.authorId,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
        author: author ? {
          id: author.user?.id || author.id,
          name: author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim(),
          email: author.email || author.user?.email,
          role: author.role || 'ADMIN'
        } : {
          id: user.userId,
          name: 'Admin',
          email: user.email,
          role: 'ADMIN'
        },
        visibleToStaff: updatedNote.visibleToStaff
      }

      return NextResponse.json(transformedNote)
    }

    // Check if note exists and user has permission to edit it
    const existingNote = await prisma.coachNote.findUnique({
      where: { id }
    })

    if (!existingNote) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      )
    }

    // Only the author or admin can edit the note
    if (existingNote.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'You can only edit your own notes' },
        { status: 403 }
      )
    }

    // Update the note and handle staff access
    const note = await prisma.$transaction(async (tx) => {
      // Update the note
      const updatedNote = await tx.coachNote.update({
        where: { id },
        data: {
          title,
          content,
          isPinned,
          updatedAt: new Date()
        }
      })

      // Delete existing staff access records
      await tx.coachNoteStaffAccess.deleteMany({
        where: { coachNoteId: id }
      })

      // Create new staff access records if provided
      if (staffAccess && Array.isArray(staffAccess)) {
        const accessData = staffAccess
          .filter(access => access.canView)
          .map(access => ({
            coachNoteId: id,
            staffId: access.staffId,
            canView: true
          }))

        if (accessData.length > 0) {
          await tx.coachNoteStaffAccess.createMany({
            data: accessData
          })
        }
      }

      // Return the updated note with relations
      return await tx.coachNote.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          visibleToStaff: {
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating coach note:', error)
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

    // Only coaches and admins can delete coach notes
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // LOCAL_DEV_MODE: Delete note from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find note
      const noteIndex = (state.coachNotes || []).findIndex((n: any) => n.id === id)
      
      if (noteIndex === -1) {
        return NextResponse.json(
          { message: 'Note not found' },
          { status: 404 }
        )
      }

      const existingNote = state.coachNotes[noteIndex]

      // Check permission
      if (existingNote.authorId !== user.userId && user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'You can only delete your own notes' },
          { status: 403 }
        )
      }

      // Remove note from array
      state.coachNotes.splice(noteIndex, 1)
      await writeState(state)

      return NextResponse.json(
        { message: 'Note deleted successfully' },
        { status: 200 }
      )
    }

    // Check if note exists and user has permission to delete it
    const existingNote = await prisma.coachNote.findUnique({
      where: { id }
    })

    if (!existingNote) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      )
    }

    // Only the author or admin can delete the note
    if (existingNote.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    await prisma.coachNote.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Note deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting coach note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
