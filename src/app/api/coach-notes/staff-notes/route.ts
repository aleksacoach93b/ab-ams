import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
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

    // Only staff members can access this endpoint
    if (user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // LOCAL_DEV_MODE: Return filtered notes from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      let notes = (state.coachNotes || []).slice()

      // Find staff member
      const staffMember = state.staff?.find((s: any) => 
        s.user?.id === user.userId || s.id === user.userId
      )

      if (!staffMember) {
        console.warn(`⚠️ [STAFF NOTES] Staff user ${user.userId} not found in state.staff`)
        return NextResponse.json({ notes: [] })
      }

      const staffId = staffMember.id
      console.log(`🔍 [STAFF NOTES] Staff member found:`, { id: staffId, name: staffMember.name, userId: user.userId })

      // Filter notes that are visible to this staff member
      notes = notes.filter((note: any) => {
        if (!note.visibleToStaff || !Array.isArray(note.visibleToStaff) || note.visibleToStaff.length === 0) {
          return false
        }

        return note.visibleToStaff.some((access: any) => {
          if (!access || typeof access !== 'object') {
            return false
          }

          // Get access staffId from multiple possible locations
          const accessStaffId = access.staffId || access.staff?.id || access.userId
          const accessStaffObjId = access.staff?.id

          // Match by staffId - check all possible combinations
          const staffIdMatch = 
            accessStaffId === staffId || 
            accessStaffId === staffMember.id ||
            accessStaffObjId === staffId ||
            accessStaffObjId === staffMember.id ||
            (accessStaffId && String(accessStaffId) === String(staffId)) ||
            (accessStaffObjId && String(accessStaffObjId) === String(staffId))

          // Check canView - default to true if not specified
          const canView = access.canView !== false && 
                         access.canView !== 'false' && 
                         (access.canView === true || access.canView === 'true' || access.canView === undefined)

          return staffIdMatch && canView
        })
      })

      // Sort: pinned first, then by createdAt descending
      notes.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // Transform notes for frontend
      const transformedNotes = notes.map((note: any) => {
        // Find author from staff or players
        let author = null
        
        if (state.staff) {
          for (const s of state.staff) {
            if (s.user?.id === note.authorId || s.id === note.authorId) {
              author = s
              break
            }
          }
        }
        
        if (!author && state.players) {
          for (const p of state.players) {
            const playerUser = state.playerUsers?.find((u: any) => u.playerId === p.id)
            if (playerUser?.id === note.authorId || p.id === note.authorId) {
              author = p
              break
            }
          }
        }

        // Format visibleToStaff
        const formattedVisibleToStaff = (note.visibleToStaff || [])
          .filter((access: any) => access && typeof access === 'object')
          .map((access: any) => {
            let staffObj = access.staff
            
            if (!staffObj || typeof staffObj !== 'object' || !staffObj.id) {
              const staffId = access.staffId || access.staff?.id
              if (staffId) {
                const staffMember = state.staff?.find((s: any) => s.id === staffId)
                if (staffMember) {
                  staffObj = {
                    id: staffMember.id,
                    name: staffMember.name || `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() || 'Unknown',
                    email: staffMember.email || staffMember.user?.email || ''
                  }
                }
              }
            }
            
            if (!staffObj || typeof staffObj !== 'object' || !staffObj.id) {
              return null
            }
            
            return {
              id: access.id || `access-${Date.now()}-${Math.random()}`,
              canView: access.canView !== false,
              staff: {
                id: staffObj.id,
                name: staffObj.name || staffObj.email?.split('@')[0] || 'Unknown Staff',
                email: staffObj.email || ''
              }
            }
          })
          .filter((access: any): access is NonNullable<typeof access> => access !== null)

        // Format author
        let authorInfo
        if (author) {
          if (author.user) {
            authorInfo = {
              id: author.user.id || author.id,
              name: author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Staff',
              email: author.email || author.user.email || '',
              role: author.role || 'STAFF'
            }
          } else {
            authorInfo = {
              id: note.authorId,
              name: author.name || 'Player',
              email: author.email || '',
              role: 'PLAYER'
            }
          }
        } else {
          authorInfo = {
            id: note.authorId || 'admin',
            name: 'Admin',
            email: '',
            role: 'ADMIN'
          }
        }

        return {
          id: note.id,
          title: note.title,
          content: note.content,
          isPinned: note.isPinned,
          authorId: note.authorId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          author: authorInfo,
          visibleToStaff: formattedVisibleToStaff
        }
      })

      console.log(`✅ [STAFF NOTES] Returning ${transformedNotes.length} notes for staff ${staffId}`)
      return NextResponse.json({ notes: transformedNotes })
    }

    // Find the staff member
    const staffMember = await prisma.staff.findUnique({
      where: { userId: user.userId }
    })

    if (!staffMember) {
      return NextResponse.json(
        { message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Fetch notes that are visible to this staff member
    const notes = await prisma.coach_notes.findMany({
      where: {
        coach_note_staff_access: {
          some: {
            staffId: staffMember.id,
            canView: true
          }
        }
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform notes for frontend
    const transformedNotes = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      isPinned: note.isPinned,
      authorId: note.authorId,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      author: note.users ? {
        id: note.users.id,
        name: `${note.users.firstName} ${note.users.lastName}`,
        email: note.users.email,
        role: note.users.role
      } : null,
      visibleToStaff: note.coach_note_staff_access.map(access => ({
        id: access.id,
        staffId: access.staffId,
        canView: access.canView,
        staff: access.staff ? {
          id: access.staff.id,
          name: `${access.staff.firstName} ${access.staff.lastName}`,
          email: access.staff.email
        } : null
      }))
    }))

    return NextResponse.json({ notes: transformedNotes })
  } catch (error) {
    console.error('Error fetching staff notes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
