import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting simple database seed...')

  // Create admin user
  const adminPassword = await hashPassword('Teodor2025')
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'aleksacoach@gmail.com' },
    update: {},
    create: {
      email: 'aleksacoach@gmail.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  // Create team
  let team = await prisma.team.findFirst({
    where: { name: 'Sepsi OSK' },
  })

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Sepsi OSK',
        description: 'Sepsi OSK Football Team',
      },
    })
  }

  // Create players
  const playerEmails = [
    'boris.cmiljanic@sepsi.ro',
    'mihajlo.neskovic@sepsi.ro', 
    'marko.markovic@sepsi.ro',
    'tamas.santa@sepsi.ro',
    'dino.skorup@sepsi.ro'
  ]

  const playerNames = [
    'Boris Cmiljanic',
    'Mihajlo Neskovic',
    'Marko Markovic', 
    'Tamas Santa',
    'Dino Skorup'
  ]

  const positions = ['Midfielder', 'Defender', 'Forward', 'Midfielder', 'Goalkeeper']

  console.log('👥 Creating players...')
  for (let i = 0; i < playerEmails.length; i++) {
    const userPassword = await hashPassword('player123')
    const user = await prisma.user.upsert({
      where: { email: playerEmails[i] },
      update: {},
      create: {
        email: playerEmails[i],
        password: userPassword,
        role: UserRole.PLAYER,
        isActive: true,
      },
    })

    await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: playerNames[i],
        email: playerEmails[i],
        position: positions[i],
        status: 'ACTIVE',
        teamId: team.id,
      },
    })
  }

  // Create staff
  const staffEmails = [
    'sorin.colceag@sepsi.ro',
    'ovidiu.burca@sepsi.ro',
    'nikola.stankovic@sepsi.ro'
  ]

  const staffNames = [
    'Sorin Colceag',
    'Ovidiu Burca', 
    'Nikola Stankovic'
  ]

  const staffPositions = ['Assistant Coach', 'Physiotherapist', 'Fitness Coach']

  console.log('👨‍💼 Creating staff...')
  for (let i = 0; i < staffEmails.length; i++) {
    const userPassword = await hashPassword('staff123')
    const user = await prisma.user.upsert({
      where: { email: staffEmails[i] },
      update: {},
      create: {
        email: staffEmails[i],
        password: userPassword,
        role: UserRole.STAFF,
        isActive: true,
      },
    })

    await prisma.staff.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: staffNames[i],
        email: staffEmails[i],
        position: staffPositions[i],
        teamId: team.id,
        canViewReports: true,
        canEditReports: i === 1, // Only Ovidiu can edit
        canDeleteReports: false,
      },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('👑 Admin: aleksacoach@gmail.com / Teodor2025')
  console.log('👥 Players: [email] / player123')
  console.log('👨‍💼 Staff: [email] / staff123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
