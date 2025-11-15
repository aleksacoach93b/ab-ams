import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default admin user with provided credentials
  const adminPassword = await hashPassword('Teodor2025')
  
  const adminUser = await prisma.users.upsert({
    where: { email: 'aleksacoach@gmail.com' },
    update: {
      role: UserRole.ADMIN, // Ensure admin role
      password: adminPassword, // Update password
    },
    create: {
      id: 'admin_user_001',
      email: 'aleksacoach@gmail.com',
      password: adminPassword,
      firstName: 'Aleksa',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
      updatedAt: new Date(),
    },
  })

  // Note: Admin user can also act as coach, so no separate coach user needed
  // If you need a separate coach user, create it manually through the admin panel

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Default Login Credentials:')
  console.log('👑 Admin Account:')
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
