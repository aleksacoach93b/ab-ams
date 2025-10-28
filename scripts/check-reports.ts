import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkReports() {
  try {
    console.log('📊 Checking all reports and their folder assignments...\n')
    
    const reports = await prisma.report.findMany({
      include: {
        folder: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${reports.length} reports:\n`)
    
    reports.forEach((report, index) => {
      console.log(`${index + 1}. Report: "${report.name}"`)
      console.log(`   - ID: ${report.id}`)
      console.log(`   - Folder ID: ${report.folderId}`)
      console.log(`   - Folder Name: ${report.folder ? report.folder.name : 'No folder (root level)'}`)
      console.log(`   - File Type: ${report.fileType}`)
      console.log(`   - Created: ${report.createdAt}`)
      console.log('')
    })

    // Check folders
    console.log('📁 Checking all folders:\n')
    
    const folders = await prisma.reportFolder.findMany({
      include: {
        reports: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    folders.forEach((folder, index) => {
      console.log(`${index + 1}. Folder: "${folder.name}"`)
      console.log(`   - ID: ${folder.id}`)
      console.log(`   - Reports count: ${folder.reports.length}`)
      if (folder.reports.length > 0) {
        folder.reports.forEach(report => {
          console.log(`     - "${report.name}" (${report.fileType})`)
        })
      }
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error checking reports:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkReports()
