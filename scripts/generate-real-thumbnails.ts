import { PrismaClient } from '@prisma/client'
import { RealPDFThumbnail } from '../src/lib/realPdfThumbnail'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

const prisma = new PrismaClient()

async function generateRealThumbnails() {
  try {
    console.log('🖼️ Generating REAL thumbnails for existing PDF files...')

    // Get all PDF media files without thumbnails
    const pdfFiles = await prisma.playerMedia.findMany({
      where: {
        fileType: 'application/pdf',
        thumbnailUrl: null
      },
      include: {
        player: true
      }
    })

    console.log(`📄 Found ${pdfFiles.length} PDF files without thumbnails`)

    if (pdfFiles.length === 0) {
      console.log('✅ All PDF files already have thumbnails!')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const file of pdfFiles) {
      try {
        console.log(`\n🔄 Processing: ${file.fileName}`)
        console.log(`   Player: ${file.player.name}`)
        console.log(`   File URL: ${file.fileUrl}`)

        // Construct full file path
        const filePath = join(process.cwd(), 'public', file.fileUrl)
        
        if (!existsSync(filePath)) {
          console.log(`❌ File not found: ${filePath}`)
          errorCount++
          continue
        }

        // Read file buffer
        const fileBuffer = await readFile(filePath)
        console.log(`📁 File size: ${fileBuffer.length} bytes`)

        // Generate real thumbnail
        const thumbnailsDir = join(process.cwd(), 'public', 'uploads', 'players', file.playerId, 'thumbnails')
        const thumbnailUrl = await RealPDFThumbnail.generateRealThumbnail(
          fileBuffer,
          thumbnailsDir,
          file.fileName
        )

        // Update database
        await prisma.playerMedia.update({
          where: { id: file.id },
          data: { thumbnailUrl }
        })

        console.log(`✅ Real thumbnail generated: ${thumbnailUrl}`)
        successCount++

      } catch (error) {
        console.error(`❌ Error processing ${file.fileName}:`, error)
        errorCount++
      }
    }

    console.log(`\n🎉 Real thumbnail generation completed!`)
    console.log(`✅ Success: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)

  } catch (error) {
    console.error('❌ Error generating real thumbnails:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateRealThumbnails()
