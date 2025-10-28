import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default admin user
  const adminPassword = await hashPassword('admin123')
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ab-athletes.com' },
    update: {},
    create: {
      email: 'admin@ab-athletes.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  // Create coach user with provided credentials
  const coachPassword = await hashPassword('Teodor2025')
  
  const coachUser = await prisma.user.upsert({
    where: { email: 'aleksacoach@gmail.com' },
    update: {},
    create: {
      email: 'aleksacoach@gmail.com',
      password: coachPassword,
      name: 'Aleksa Coach',
      role: UserRole.COACH,
      isActive: true,
    },
  })

  // Create default team
  let team = await prisma.team.findFirst({
    where: { name: 'Default Team' },
  })

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Default Team',
        description: 'Default team for the AB Athlete Management System',
      },
    })
  }

  // Create staff profile for coach
  await prisma.staff.upsert({
    where: { userId: coachUser.id },
    update: {},
    create: {
      userId: coachUser.id,
      name: 'Aleksa Coach',
      email: 'aleksacoach@gmail.com',
      position: 'Head Coach',
      teamId: team.id,
      canViewReports: true,
      canEditReports: true,
      canCreateEvents: true,
      canEditEvents: true,
      canViewAllPlayers: true,
      canEditPlayers: true,
      canViewCalendar: true,
      canViewDashboard: true,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Default Login Credentials:')
  console.log('👑 Admin Account:')
  console.log('   Email: admin@ab-athletes.com')
  console.log('   Password: admin123')
  console.log('\n👨‍🏫 Coach Account:')
  console.log('   Email: aleksacoach@gmail.com')
  console.log('   Password: Teodor2025')
  console.log('\n🔗 Login URL: http://localhost:3000/login')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
