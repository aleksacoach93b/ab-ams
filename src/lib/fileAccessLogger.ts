import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export interface FileAccessLogData {
  userId: string
  fileType: 'REPORT' | 'MEDIA' | 'AVATAR' | 'PLAYER_MEDIA' | 'EVENT_MEDIA'
  fileId?: string
  fileName?: string
  action: 'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'DELETE'
  ipAddress?: string
  userAgent?: string
}

export async function logFileAccess(logData: FileAccessLogData) {
  try {
    // Save to database
    await prisma.file_access_logs.create({
      data: {
        userId: logData.userId,
        fileType: logData.fileType,
        fileId: logData.fileId,
        fileName: logData.fileName,
        action: logData.action,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent
      }
    })
    console.log('📝 File access logged:', logData)
  } catch (error) {
    console.error('Error logging file access:', error)
    // Don't throw - logging should not break the main flow
  }
}

export function getClientInfo(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.ip || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}
