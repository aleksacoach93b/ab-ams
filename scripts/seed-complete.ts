import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting complete database seed...')

  // Create admin user (Aleksa Boskovic)
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

  // Create default team
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
  const players = [
    {
      name: 'Boris Cmiljanic',
      email: 'boris.cmiljanic@sepsi.ro',
      position: 'Midfielder',
      dateOfBirth: new Date('1995-03-15'),
      height: 180,
      weight: 75,
      status: 'FULLY_AVAILABLE',
    },
    {
      name: 'Mihajlo Neskovic',
      email: 'mihajlo.neskovic@sepsi.ro',
      position: 'Defender',
      dateOfBirth: new Date('1993-07-22'),
      height: 185,
      weight: 82,
      status: 'FULLY_AVAILABLE',
    },
    {
      name: 'Marko Markovic',
      email: 'marko.markovic@sepsi.ro',
      position: 'Forward',
      dateOfBirth: new Date('1994-11-08'),
      height: 175,
      weight: 70,
      status: 'PHYSIO_THERAPY',
    },
    {
      name: 'Tamas Santa',
      email: 'tamas.santa@sepsi.ro',
      position: 'Midfielder',
      dateOfBirth: new Date('1996-01-12'),
      height: 178,
      weight: 73,
      status: 'FULLY_AVAILABLE',
    },
    {
      name: 'Dino Skorup',
      email: 'dino.skorup@sepsi.ro',
      position: 'Goalkeeper',
      dateOfBirth: new Date('1992-09-05'),
      height: 190,
      weight: 85,
      status: 'FULLY_AVAILABLE',
    }
  ]

  console.log('👥 Creating players...')
  for (const playerData of players) {
    // Create user account for player
    const userPassword = await hashPassword('player123')
    const user = await prisma.user.upsert({
      where: { email: playerData.email },
      update: {},
      create: {
        email: playerData.email,
        password: userPassword,
        role: UserRole.PLAYER,
        isActive: true,
      },
    })

    // Create player profile
    await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: playerData.name,
        email: playerData.email,
        position: playerData.position,
        dateOfBirth: playerData.dateOfBirth,
        height: playerData.height,
        weight: playerData.weight,
        status: playerData.status,
        teamId: team.id,
      },
    })
  }

  // Create staff members
  const staffMembers = [
    {
      name: 'Sorin Colceag',
      email: 'sorin.colceag@sepsi.ro',
      position: 'Assistant Coach',
      canViewReports: true,
      canEditReports: false,
      canDeleteReports: false,
    },
    {
      name: 'Ovidiu Burca',
      email: 'ovidiu.burca@sepsi.ro',
      position: 'Physiotherapist',
      canViewReports: true,
      canEditReports: true,
      canDeleteReports: false,
    },
    {
      name: 'Nikola Stankovic',
      email: 'nikola.stankovic@sepsi.ro',
      position: 'Fitness Coach',
      canViewReports: true,
      canEditReports: false,
      canDeleteReports: false,
    }
  ]

  console.log('👨‍💼 Creating staff members...')
  for (const staffData of staffMembers) {
    // Create user account for staff
    const userPassword = await hashPassword('staff123')
    const user = await prisma.user.upsert({
      where: { email: staffData.email },
      update: {},
      create: {
        email: staffData.email,
        password: userPassword,
        role: UserRole.STAFF,
        isActive: true,
      },
    })

    // Create staff profile
    await prisma.staff.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: staffData.name,
        email: staffData.email,
        position: staffData.position,
        teamId: team.id,
        canViewReports: staffData.canViewReports,
        canEditReports: staffData.canEditReports,
        canDeleteReports: staffData.canDeleteReports,
        isActive: true,
      },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('👑 Admin Account:')
  console.log('   Email: aleksacoach@gmail.com')
  console.log('   Password: Teodor2025')
  console.log('\n👥 Player Accounts:')
  players.forEach(player => {
    console.log(`   ${player.name}: ${player.email} / player123`)
  })
  console.log('\n👨‍💼 Staff Accounts:')
  staffMembers.forEach(staff => {
    console.log(`   ${staff.name}: ${staff.email} / staff123`)
  })
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
