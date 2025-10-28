import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const adminEmail = process.env.ADMIN_EMAIL || 'aleksacoach@gmail.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Teodor2025'

    console.log('Checking for existing admin user...')
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', adminEmail)
      
      // Update the admin user to ensure they have the correct role and are active
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
        }
      })
      
      console.log('✅ Admin user updated successfully')
      return
    }

    // Create new admin user
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', adminEmail)
    console.log('🆔 User ID:', adminUser.id)
    console.log('🔑 Password: [Set from environment variable or default]')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin setup completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error)
      process.exit(1)
    })
}

export { createAdminUser }
