import { prisma } from '../src/lib/prisma'
import { generateToken } from '../src/lib/auth'

async function getAdminToken() {
  try {
    console.log('🔍 Looking for admin user...')

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    })

    if (!adminUser) {
      console.log('❌ No admin user found')
      return
    }

    console.log('✅ Found admin user:', adminUser.email)

    // Generate token
    const token = generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    })

    console.log('🔑 Admin token generated:')
    console.log(token)

    // Test the token
    console.log('\n🧪 Testing token...')
    const response = await fetch('http://localhost:3000/api/analytics/events-csv', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('Status:', response.status)
    if (response.ok) {
      const csvContent = await response.text()
      console.log('✅ CSV Response (first 200 chars):')
      console.log(csvContent.substring(0, 200))
    } else {
      const error = await response.text()
      console.log('❌ Error:', error)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getAdminToken()
