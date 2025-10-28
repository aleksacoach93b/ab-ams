import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupAuth() {
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
    await prisma.player.upsert({
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

    console.log('\n🎉 Authentication setup completed!')
    console.log('\n📋 Test Credentials:')
    console.log('👑 Admin: aleksacoach@gmail.com / Teodor2025')
    console.log('🏃 Coach: coach@example.com / coach123')
    console.log('⚽ Player: player@example.com / player123')
    console.log('👨‍⚕️ Staff: staff@example.com / staff123')

  } catch (error) {
    console.error('❌ Error setting up authentication:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAuth()
