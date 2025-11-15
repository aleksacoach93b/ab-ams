import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState, writeState } from '@/lib/localDevStore'

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

    // Only ADMIN can view all notes, staff only if admin gave them access
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // LOCAL_DEV_MODE: Return notes from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      let notes = (state.coachNotes || []).slice()

      // Filter notes based on user role
      if (user.role === 'ADMIN') {
        // ADMIN sees all notes
        console.log(`✅ [COACH NOTES] Admin user, returning all ${notes.length} notes`)
      } else if (user.role === 'STAFF') {
        // Find staff member - check multiple ID matches
        console.log(`🔍 [COACH NOTES] Looking for staff with user.userId: ${user.userId}`)
        console.log(`🔍 [COACH NOTES] Available staff:`, state.staff?.map((s: any) => ({ 
          id: s.id, 
          user_id: s.user?.id,
          name: s.name 
        })))
        
        const staffMember = state.staff?.find((s: any) => {
          // Check multiple possible matches
          const userMatch = s.user?.id === user.userId
          const idMatch = s.id === user.userId
          const matches = userMatch || idMatch
          
          if (matches) {
            console.log(`✅ Found staff member:`, { 
              id: s.id, 
              name: s.name, 
              user_id: s.user?.id,
              userId_from_token: user.userId,
              userMatch,
              idMatch
            })
          }
          return matches
        })
        
        if (staffMember) {
          const staffId = staffMember.id
          console.log(`🔍 [COACH NOTES] Staff member found:`, { id: staffId, name: staffMember.name, userId: user.userId })
          console.log(`🔍 [COACH NOTES] Total notes before filtering: ${notes.length}`)
          
          // Staff can only see notes they have access to
          // Check both staffId match and canView === true
          notes = notes.filter((note: any) => {
            if (!note.visibleToStaff || !Array.isArray(note.visibleToStaff) || note.visibleToStaff.length === 0) {
              console.log(`❌ Note "${note.title}" has no visibleToStaff array or it's empty`)
              return false
            }
            
            console.log(`🔍 Checking note "${note.title}" with visibleToStaff:`, note.visibleToStaff.map((a: any) => ({ 
              staffId: a.staffId, 
              canView: a.canView,
              staff_id: a.staff?.id
            })))
            
            const hasAccess = note.visibleToStaff.some((access: any) => {
              if (!access || typeof access !== 'object') {
                console.log(`   ❌ Access object is invalid:`, access)
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
              
              const matches = staffIdMatch && canView
              
              if (matches) {
                console.log(`   ✅ ACCESS GRANTED - accessStaffId: ${accessStaffId}, staffId: ${staffId}, canView: ${canView}`)
              } else {
                console.log(`   ❌ ACCESS DENIED - accessStaffId: ${accessStaffId}, accessStaffObjId: ${accessStaffObjId}, staffId: ${staffId}, staffMember.id: ${staffMember.id}, canView: ${canView}, staffIdMatch: ${staffIdMatch}`)
              }
              
              return matches
            })
            
            if (!hasAccess) {
              console.log(`❌ Note "${note.title}" not accessible`)
              console.log(`   Staff ID: ${staffId}`)
              console.log(`   VisibleToStaff:`, note.visibleToStaff.map((a: any) => ({ 
                staffId: a.staffId, 
                canView: a.canView,
                staff_id: a.staff?.id 
              })))
            }
            
            return hasAccess
          })
          
          console.log(`✅ [COACH NOTES] Staff user ${user.userId} (staffId: ${staffId}), filtered to ${notes.length} accessible notes`)
        } else {
          console.warn(`⚠️ [COACH NOTES] Staff user ${user.userId} not found in state.staff`)
          console.warn(`   Available staff:`, state.staff?.map((s: any) => ({ id: s.id, name: s.name, userId: s.user?.id })))
          notes = []
        }
      } else {
        notes = []
      }

      // Sort: pinned first, then by createdAt descending
      notes.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      // Apply pagination
      const paginatedNotes = notes.slice(offset, offset + limit)

      // Transform notes for frontend
      const transformedNotes = paginatedNotes.map((note: any) => {
        // Find author from staff or players (for admin, use admin user)
        // Check if authorId matches any staff user.id or playerUser.id
        let author = null
        
        // First check staff
        if (state.staff) {
          for (const s of state.staff) {
            if (s.user?.id === note.authorId || s.id === note.authorId) {
              author = s
              break
            }
          }
        }
        
        // If not found in staff, check players
        if (!author && state.players) {
          for (const p of state.players) {
            const playerUser = state.playerUsers?.find((u: any) => u.playerId === p.id)
            if (playerUser?.id === note.authorId || p.id === note.authorId) {
              author = p
              break
            }
          }
        }

        // Ensure visibleToStaff is properly formatted with staff objects
        const formattedVisibleToStaff = (note.visibleToStaff || [])
          .filter((access: any) => access && typeof access === 'object') // Filter out null/undefined
          .map((access: any) => {
            // If staff object is missing or null, try to find it by staffId
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
            
            // If still no valid staff object, skip this access entry
            if (!staffObj || typeof staffObj !== 'object' || !staffObj.id) {
              return null
            }
            
            // Ensure staff object has all required fields
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
          .filter((access: any): access is NonNullable<typeof access> => access !== null) // Remove null entries

        // If author not found, create a default admin author object
        let authorInfo
        if (author) {
          // Check if author is staff (has user property) or player
          if (author.user) {
            // Staff member
            authorInfo = {
              id: author.user.id || author.id,
              name: author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Staff',
              email: author.email || author.user.email || '',
              role: author.role || 'STAFF'
            }
          } else {
            // Player
            authorInfo = {
              id: note.authorId,
              name: author.name || 'Player',
              email: author.email || '',
              role: 'PLAYER'
            }
          }
        } else {
          // Default admin (when authorId doesn't match any staff/player)
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

      return NextResponse.json({ notes: transformedNotes })
    }

    // Fetch coach notes
    const notes = await prisma.coach_notes.findMany({
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
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Filter notes based on user role
    let filteredNotes = notes
    if (user.role === 'ADMIN') {
      // ADMIN sees all notes
      filteredNotes = notes
    } else if (user.role === 'STAFF') {
      // Get the staff member for this user
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.userId }
      })
      
      if (staffMember) {
        // Staff can only see notes that have explicit access in coach_note_staff_access
        filteredNotes = notes.filter(note => 
          note.coach_note_staff_access.some(access => 
            access.staffId === staffMember.id && access.canView
          )
        )
      } else {
        filteredNotes = []
      }
    } else {
      filteredNotes = []
    }

    // Transform notes for frontend
    const transformedNotes = filteredNotes.map(note => ({
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
    console.error('Error fetching coach notes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Only ADMIN can create coach notes
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, isPinned, staffAccess } = body

    if (!title || !content) {
      return NextResponse.json(
        { message: 'Title and content are required' },
        { status: 400 }
      )
    }

    if (!user.userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // LOCAL_DEV_MODE: Save note to state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const now = new Date().toISOString()
      const noteId = `note_${Date.now()}`
      
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
          id: `access-${noteId}-${staffMember.id}`,
          staffId: staffMember.id,
          canView: access.canView !== undefined ? access.canView : true,
          staff: {
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email || staffMember.user?.email
          }
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)

      const newNote = {
        id: noteId,
        title,
        content,
        isPinned: isPinned || false,
        authorId: user.userId,
        createdAt: now,
        updatedAt: now,
        visibleToStaff
      }

      // Ensure coachNotes array exists
      if (!state.coachNotes) {
        state.coachNotes = []
      }

      state.coachNotes.push(newNote)
      await writeState(state)

      // Find author for response - check staff first, then use user info
      const author = state.staff?.find((s: any) => s.user?.id === user.userId)
      
      // If no author found in staff, use user info from token
      const authorInfo = author ? {
        id: author.user?.id || author.id,
        name: author.name || `${author.firstName || ''} ${author.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
        email: author.email || author.user?.email || user.email || '',
        role: author.role || 'ADMIN'
      } : {
        id: user.userId,
        name: user.email?.split('@')[0] || 'Admin',
        email: user.email || '',
        role: 'ADMIN'
      }

      const transformedNote = {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        isPinned: newNote.isPinned,
        authorId: newNote.authorId,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
        author: authorInfo,
        visibleToStaff: newNote.visibleToStaff
      }

      return NextResponse.json(transformedNote, { status: 201 })
    }

    // Create the note
    const note = await prisma.coach_notes.create({
      data: {
        id: `note_${Date.now()}`,
        title,
        content,
        isPinned: isPinned || false,
        authorId: user.userId,
        updatedAt: new Date()
      }
    })

    // Create coach_note_staff_access entries if staff access is provided
    if (staffAccess && Array.isArray(staffAccess) && staffAccess.length > 0) {
      await prisma.coach_note_staff_access.createMany({
        data: staffAccess.map((access: { staffId: string; canView?: boolean }) => ({
          id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          noteId: note.id,
          staffId: access.staffId,
          canView: access.canView !== undefined ? access.canView : true
        }))
      })
    }

    // Fetch the created note with relations
    const createdNote = await prisma.coach_notes.findUnique({
      where: { id: note.id },
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

    // Transform for frontend
    const transformedNote = {
      id: createdNote!.id,
      title: createdNote!.title,
      content: createdNote!.content,
      isPinned: createdNote!.isPinned,
      authorId: createdNote!.authorId,
      createdAt: createdNote!.createdAt.toISOString(),
      updatedAt: createdNote!.updatedAt.toISOString(),
      author: createdNote!.users ? {
        id: createdNote!.users.id,
        name: `${createdNote!.users.firstName} ${createdNote!.users.lastName}`,
        email: createdNote!.users.email,
        role: createdNote!.users.role
      } : null,
      visibleToStaff: createdNote!.coach_note_staff_access.map(access => ({
        id: access.id,
        staffId: access.staffId,
        canView: access.canView,
        staff: access.staff ? {
          id: access.staff.id,
          name: `${access.staff.firstName} ${access.staff.lastName}`,
          email: access.staff.email
        } : null
      }))
    }

    return NextResponse.json(transformedNote, { status: 201 })
  } catch (error) {
    console.error('Error creating coach note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
