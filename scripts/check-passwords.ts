import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function checkPasswords() {
  try {
    console.log('🔍 Checking user passwords...')

    // Get all users with their passwords
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true
      }
    })

    console.log(`👥 Found ${users.length} users:`)
    
    for (const user of users) {
      console.log(`\n👤 ${user.name} (${user.email}) - ${user.role}`)
      console.log(`   Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'No password'}`)
      
      // Test common passwords
      const commonPasswords = ['password123', 'admin123', 'player123', '123456', 'password', 'boris123', 'mihajlo123', 'dino123', 'matei123', 'paun123', 'raul123', 'fabio123']
      
      for (const testPassword of commonPasswords) {
        if (user.password) {
          const isValid = await bcrypt.compare(testPassword, user.password)
          if (isValid) {
            console.log(`   ✅ Password found: ${testPassword}`)
            break
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking passwords:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPasswords()
