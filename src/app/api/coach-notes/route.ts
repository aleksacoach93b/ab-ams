import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    // Only coaches, admins, and staff with permission can view coach notes
    if (user.role !== 'ADMIN' && user.role !== 'COACH' && user.role !== 'STAFF') {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch coach notes
    const notes = await prisma.coachNote.findMany({
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
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Filter notes based on user role and individual staff access
    let filteredNotes = notes
    if (user.role === 'STAFF') {
      // Get the staff member for this user
      const staffMember = await prisma.staff.findUnique({
        where: { userId: user.userId }
      })
      
      if (staffMember) {
        // Staff can only see notes that they have explicit access to
        filteredNotes = notes.filter(note => 
          note.visibleToStaff.some(access => 
            access.staffId === staffMember.id && access.canView
          )
        )
      } else {
        filteredNotes = []
      }
    }

    return NextResponse.json({ notes: filteredNotes })
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


    // Only coaches and admins can create coach notes
    if (user.role !== 'ADMIN' && user.role !== 'COACH') {
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

    // Create the note with staff access controls
    const noteData: any = {
      title,
      content,
      isPinned: isPinned || false,
      authorId: user.userId
    }

    // Only add visibleToStaff if there are staff access entries
    if (staffAccess && staffAccess.length > 0) {
      noteData.visibleToStaff = {
        create: staffAccess.map((access: { staffId: string; canView: boolean }) => ({
          staffId: access.staffId,
          canView: access.canView
        }))
      }
    }

    const note = await prisma.coachNote.create({
      data: noteData,
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

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating coach note:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
