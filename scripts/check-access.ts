import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAccess() {
  try {
    console.log('🔍 Checking report access records...\n')
    
    const accesses = await prisma.reportAccess.findMany({
      include: {
        report: true
      }
    })

    console.log(`Found ${accesses.length} access records:\n`)
    
    accesses.forEach((access, index) => {
      console.log(`${index + 1}. Access Record:`)
      console.log(`   - User ID: ${access.userId}`)
      console.log(`   - Report: "${access.report.name}"`)
      console.log(`   - Action: ${access.action}`)
      console.log(`   - Accessed: ${access.accessedAt}`)
      console.log('')
    })

    // Check users
    console.log('👥 Checking users:\n')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    })

    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email}`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - Role: ${user.role}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error checking access:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAccess()
