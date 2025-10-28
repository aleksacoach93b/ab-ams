import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function seedStaff() {
  try {
    console.log('🌱 Seeding staff member...')

    // Create a test staff member
    const hashedPassword = await hashPassword('staff123')

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: 'staff@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Physiotherapist',
        role: UserRole.STAFF,
        isActive: true
      }
    })

    // Create staff record with permissions
    const staff = await prisma.staff.create({
      data: {
        userId: user.id,
        firstName: 'John',
        lastName: 'Physiotherapist',
        email: 'staff@example.com',
        position: 'Physiotherapist',
        department: 'Medical',
        experience: 5,
        // Set permissions - can view dashboard, calendar, players, and add player media
        canCreateEvents: false,
        canEditEvents: false,
        canDeleteEvents: false,
        canViewAllPlayers: true,
        canEditPlayers: false,
        canDeletePlayers: false,
        canAddPlayerMedia: true,
        canEditPlayerMedia: false,
        canDeletePlayerMedia: false,
        canAddPlayerNotes: true,
        canEditPlayerNotes: false,
        canDeletePlayerNotes: false,
        canViewCalendar: true,
        canViewDashboard: true,
        canManageStaff: false,
        canViewReports: false
      }
    })

    console.log('✅ Staff member created successfully!')
    console.log('📧 Email: staff@example.com')
    console.log('🔑 Password: staff123')
    console.log('👤 Role: STAFF')
    console.log('🏥 Position: Physiotherapist')
    console.log('📋 Permissions: View Dashboard, Calendar, Players, Add Player Media & Notes')

  } catch (error) {
    console.error('❌ Error seeding staff:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedStaff()
