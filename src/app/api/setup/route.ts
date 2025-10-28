import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up authentication system...')

    // Create admin user
    const adminPassword = await bcrypt.hash('Teodor2025', 12)
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'aleksacoach@gmail.com' },
      update: {
        password: adminPassword,
        role: 'ADMIN',
        firstName: 'Aleksa',
        lastName: 'Boskovic',
        isActive: true
      },
      create: {
        email: 'aleksacoach@gmail.com',
        password: adminPassword,
        role: 'ADMIN',
        firstName: 'Aleksa',
        lastName: 'Boskovic',
        isActive: true,
        emailVerified: true
      }
    })

    console.log('✅ Admin user created:', adminUser.email)

    // Create a sample coach
    const coachPassword = await bcrypt.hash('coach123', 12)
    
    const coachUser = await prisma.user.upsert({
      where: { email: 'coach@example.com' },
      update: {
        password: coachPassword,
        role: 'COACH',
        firstName: 'John',
        lastName: 'Coach',
        isActive: true
      },
      create: {
        email: 'coach@example.com',
        password: coachPassword,
        role: 'COACH',
        firstName: 'John',
        lastName: 'Coach',
        isActive: true,
        emailVerified: true
      }
    })

    // Create coach profile
    await prisma.coach.upsert({
      where: { userId: coachUser.id },
      update: {
        firstName: 'John',
        lastName: 'Coach',
        email: 'coach@example.com',
        coachType: 'Head Coach',
        specialization: 'Tactical'
      },
      create: {
        userId: coachUser.id,
        firstName: 'John',
        lastName: 'Coach',
        email: 'coach@example.com',
        coachType: 'Head Coach',
        specialization: 'Tactical'
      }
    })

    console.log('✅ Coach user created:', coachUser.email)

    // Create a sample player
    const playerPassword = await bcrypt.hash('player123', 12)
    
    const playerUser = await prisma.user.upsert({
      where: { email: 'player@example.com' },
      update: {
        password: playerPassword,
        role: 'PLAYER',
        firstName: 'Mike',
        lastName: 'Player',
        isActive: true
      },
      create: {
        email: 'player@example.com',
        password: playerPassword,
        role: 'PLAYER',
        firstName: 'Mike',
        lastName: 'Player',
        isActive: true,
        emailVerified: true
      }
    })

    // Create player profile
    await prisma.players.upsert({
      where: { userId: playerUser.id },
      update: {
        firstName: 'Mike',
        lastName: 'Player',
        email: 'player@example.com',
        position: 'Midfielder',
        status: 'ACTIVE'
      },
      create: {
        userId: playerUser.id,
        firstName: 'Mike',
        lastName: 'Player',
        email: 'player@example.com',
        position: 'Midfielder',
        status: 'ACTIVE'
      }
    })

    console.log('✅ Player user created:', playerUser.email)

    // Create a sample staff member
    const staffPassword = await bcrypt.hash('staff123', 12)
    
    const staffUser = await prisma.user.upsert({
      where: { email: 'staff@example.com' },
      update: {
        password: staffPassword,
        role: 'STAFF',
        firstName: 'Sarah',
        lastName: 'Staff',
        isActive: true
      },
      create: {
        email: 'staff@example.com',
        password: staffPassword,
        role: 'STAFF',
        firstName: 'Sarah',
        lastName: 'Staff',
        isActive: true,
        emailVerified: true
      }
    })

    // Create staff profile
    await prisma.staff.upsert({
      where: { userId: staffUser.id },
      update: {
        firstName: 'Sarah',
        lastName: 'Staff',
        email: 'staff@example.com',
        position: 'Physiotherapist',
        department: 'Medical',
        canViewCalendar: true,
        canViewAllPlayers: true,
        canViewDashboard: true
      },
      create: {
        userId: staffUser.id,
        firstName: 'Sarah',
        lastName: 'Staff',
        email: 'staff@example.com',
        position: 'Physiotherapist',
        department: 'Medical',
        canViewCalendar: true,
        canViewAllPlayers: true,
        canViewDashboard: true
      }
    })

    console.log('✅ Staff user created:', staffUser.email)

    return NextResponse.json({
      message: 'Authentication setup completed successfully!',
      users: {
        admin: { email: adminUser.email, role: adminUser.role },
        coach: { email: coachUser.email, role: coachUser.role },
        player: { email: playerUser.email, role: playerUser.role },
        staff: { email: staffUser.email, role: staffUser.role }
      },
      credentials: {
        admin: { email: 'aleksacoach@gmail.com', password: 'Teodor2025' },
        coach: { email: 'coach@example.com', password: 'coach123' },
        player: { email: 'player@example.com', password: 'player123' },
        staff: { email: 'staff@example.com', password: 'staff123' }
      }
    })

  } catch (error) {
    console.error('❌ Error setting up authentication:', error)
    return NextResponse.json(
      { message: 'Error setting up authentication', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
