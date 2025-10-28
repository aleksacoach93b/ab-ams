import pdf from 'pdf-poppler'
import sharp from 'sharp'
import { writeFile, mkdir, existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const writeFileAsync = promisify(writeFile)
const mkdirAsync = promisify(mkdir)

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export class PDFThumbnailService {
  private static readonly DEFAULT_OPTIONS: ThumbnailOptions = {
    width: 300,
    height: 400,
    quality: 80,
    format: 'jpeg'
  }

  /**
   * Generate thumbnail for a PDF file
   * @param pdfPath - Path to the PDF file
   * @param outputDir - Directory to save the thumbnail
   * @param options - Thumbnail generation options
   * @returns Promise<string> - Path to the generated thumbnail
   */
  static async generateThumbnail(
    pdfPath: string,
    outputDir: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options }
      
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        await mkdirAsync(outputDir, { recursive: true })
      }

      // Generate unique filename for thumbnail
      const timestamp = Date.now()
      const thumbnailName = `thumbnail_${timestamp}.${opts.format}`
      const thumbnailPath = join(outputDir, thumbnailName)

      console.log('🖼️ Generating PDF thumbnail:', {
        pdfPath,
        outputDir,
        thumbnailPath,
        options: opts
      })

      // Convert PDF first page to image
      const convertOptions = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: `temp_${timestamp}`,
        page: 1, // Only first page
        scale: 2.0 // Higher resolution
      }

      const result = await pdf.convert(pdfPath, convertOptions)
      console.log('📄 PDF conversion result:', result)

      // Find the generated PNG file
      const tempPngPath = join(outputDir, `temp_${timestamp}-1.png`)
      
      if (!existsSync(tempPngPath)) {
        throw new Error(`Generated PNG file not found: ${tempPngPath}`)
      }

      // Resize and optimize the image using Sharp
      await sharp(tempPngPath)
        .resize(opts.width, opts.height, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .jpeg({ quality: opts.quality })
        .toFile(thumbnailPath)

      console.log('✅ Thumbnail generated successfully:', thumbnailPath)

      // Clean up temporary PNG file
      try {
        const fs = require('fs')
        fs.unlinkSync(tempPngPath)
        console.log('🗑️ Cleaned up temporary file:', tempPngPath)
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary file:', cleanupError)
      }

      return thumbnailPath
    } catch (error) {
      console.error('❌ Error generating PDF thumbnail:', error)
      throw new Error(`Failed to generate PDF thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate thumbnail for a PDF file from buffer
   * @param pdfBuffer - PDF file buffer
   * @param outputDir - Directory to save the thumbnail
   * @param options - Thumbnail generation options
   * @returns Promise<string> - Path to the generated thumbnail
   */
  static async generateThumbnailFromBuffer(
    pdfBuffer: Buffer,
    outputDir: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options }
      
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        await mkdirAsync(outputDir, { recursive: true })
      }

      // Create temporary PDF file
      const timestamp = Date.now()
      const tempPdfPath = join(outputDir, `temp_${timestamp}.pdf`)
      await writeFileAsync(tempPdfPath, pdfBuffer)

      console.log('📄 Created temporary PDF file:', tempPdfPath)

      try {
        // Generate thumbnail from temporary file
        const thumbnailPath = await this.generateThumbnail(tempPdfPath, outputDir, options)
        
        // Clean up temporary PDF file
        const fs = require('fs')
        fs.unlinkSync(tempPdfPath)
        console.log('🗑️ Cleaned up temporary PDF file:', tempPdfPath)
        
        return thumbnailPath
      } catch (error) {
        // Clean up temporary PDF file on error
        try {
          const fs = require('fs')
          fs.unlinkSync(tempPdfPath)
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up temporary PDF file:', cleanupError)
        }
        throw error
      }
    } catch (error) {
      console.error('❌ Error generating PDF thumbnail from buffer:', error)
      throw new Error(`Failed to generate PDF thumbnail from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file is a PDF
   * @param filePath - Path to the file
   * @returns boolean
   */
  static isPDF(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.pdf')
  }

  /**
   * Check if a file is a PDF by MIME type
   * @param mimeType - MIME type of the file
   * @returns boolean
   */
  static isPDFByMimeType(mimeType: string): boolean {
    return mimeType === 'application/pdf'
  }

  /**
   * Get thumbnail path for a given PDF file
   * @param pdfPath - Path to the PDF file
   * @param thumbnailsDir - Directory where thumbnails are stored
   * @returns string - Expected thumbnail path
   */
  static getThumbnailPath(pdfPath: string, thumbnailsDir: string): string {
    const path = require('path')
    const fileName = path.basename(pdfPath, '.pdf')
    return join(thumbnailsDir, `${fileName}_thumb.jpg`)
  }
}
