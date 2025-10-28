import { prisma } from '../src/lib/prisma'

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking admin users...')

    // Get all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    console.log(`👑 Found ${adminUsers.length} admin users:`)
    adminUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role}`)
    })

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: {
        role: 'asc'
      }
    })

    console.log(`\n👥 All users (${allUsers.length}):`)
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`)
    })

  } catch (error) {
    console.error('❌ Error checking admin users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminUsers()
