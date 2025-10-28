import pdf from 'pdf-poppler'
import sharp from 'sharp'
import { writeFile, mkdir, existsSync, unlink } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const writeFileAsync = promisify(writeFile)
const mkdirAsync = promisify(mkdir)
const unlinkAsync = promisify(unlink)

export class RealPDFThumbnail {
  /**
   * Generate real PDF thumbnail from first page
   */
  static async generateRealThumbnail(
    pdfBuffer: Buffer,
    outputDir: string,
    fileName: string
  ): Promise<string> {
    try {
      console.log('🖼️ Generating REAL PDF thumbnail for:', fileName)
      
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        await mkdirAsync(outputDir, { recursive: true })
      }

      const timestamp = Date.now()
      const tempPdfPath = join(outputDir, `temp_${timestamp}.pdf`)
      const tempPngPath = join(outputDir, `temp_${timestamp}.png`)
      const thumbnailPath = join(outputDir, `thumbnail_${timestamp}.jpg`)

      // Write PDF buffer to temporary file
      await writeFileAsync(tempPdfPath, pdfBuffer)
      console.log('📄 Created temporary PDF file')

      // Convert PDF first page to PNG using pdf-poppler
      const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: `temp_${timestamp}`,
        page: 1, // Only first page
        scale: 2.0 // Higher resolution for better quality
      }

      console.log('🔄 Converting PDF to PNG...')
      await pdf.convert(tempPdfPath, options)
      console.log('✅ PDF converted to PNG')

      // Check if PNG was created
      if (!existsSync(tempPngPath)) {
        throw new Error('PNG file was not created')
      }

      // Convert PNG to optimized JPG thumbnail using Sharp
      console.log('🔄 Optimizing thumbnail...')
      await sharp(tempPngPath)
        .resize(300, 400, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .jpeg({ 
          quality: 85,
          progressive: true
        })
        .toFile(thumbnailPath)

      console.log('✅ Thumbnail generated successfully')

      // Clean up temporary files
      try {
        await unlinkAsync(tempPdfPath)
        await unlinkAsync(tempPngPath)
        console.log('🗑️ Cleaned up temporary files')
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary files:', cleanupError)
      }

      // Return relative path
      const relativePath = thumbnailPath.replace(join(process.cwd(), 'public'), '')
      return relativePath.replace(/\\/g, '/')

    } catch (error) {
      console.error('❌ Error generating real PDF thumbnail:', error)
      throw new Error(`Failed to generate PDF thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file is a PDF by MIME type
   */
  static isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf'
  }
}
