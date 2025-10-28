import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixReportsVisibility() {
  console.log('🔧 Fixing Reports Visibility...')
  
  try {
    // Get all staff with canViewReports permission
    const staffWithReportsPermission = await prisma.staff.findMany({
      where: {
        canViewReports: true,
        isActive: true
      },
      select: {
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    console.log(`📋 Found ${staffWithReportsPermission.length} staff with Reports permission:`)
    staffWithReportsPermission.forEach(staff => {
      console.log(`  - ${staff.user.firstName} ${staff.user.lastName}`)
    })

    // Fix existing folders
    console.log('\n📁 Fixing existing folders...')
    const existingFolders = await prisma.reportFolder.findMany({
      where: {
        isActive: true
      },
      include: {
        visibility: true
      }
    })

    console.log(`Found ${existingFolders.length} existing folders`)

    for (const folder of existingFolders) {
      console.log(`\n🔍 Processing folder: "${folder.name}"`)
      
      // Check which staff already have visibility
      const existingUserIds = folder.visibility.map(v => v.userId)
      console.log(`  Existing visibility: ${existingUserIds.length} users`)
      
      // Add visibility for staff with reports permission who don't already have it
      for (const staff of staffWithReportsPermission) {
        if (!existingUserIds.includes(staff.userId)) {
          await prisma.reportVisibility.create({
            data: {
              folderId: folder.id,
              userId: staff.userId,
              canView: true,
              canEdit: staff.userId === folder.createdBy,
              canDelete: staff.userId === folder.createdBy
            }
          })
          console.log(`  ✅ Added visibility for ${staff.user.firstName} ${staff.user.lastName}`)
        }
      }
    }

    // Fix existing reports
    console.log('\n📄 Fixing existing reports...')
    const existingReports = await prisma.report.findMany({
      where: {
        isActive: true
      },
      include: {
        visibility: true
      }
    })

    console.log(`Found ${existingReports.length} existing reports`)

    for (const report of existingReports) {
      console.log(`\n🔍 Processing report: "${report.title}"`)
      
      // Check which staff already have visibility
      const existingUserIds = report.visibility.map(v => v.userId)
      console.log(`  Existing visibility: ${existingUserIds.length} users`)
      
      // Add visibility for staff with reports permission who don't already have it
      for (const staff of staffWithReportsPermission) {
        if (!existingUserIds.includes(staff.userId)) {
          await prisma.reportVisibility.create({
            data: {
              reportId: report.id,
              userId: staff.userId,
              canView: true,
              canEdit: staff.userId === report.createdBy,
              canDelete: staff.userId === report.createdBy
            }
          })
          console.log(`  ✅ Added visibility for ${staff.user.firstName} ${staff.user.lastName}`)
        }
      }
    }

    console.log('\n✅ Reports visibility fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing reports visibility:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixReportsVisibility()
