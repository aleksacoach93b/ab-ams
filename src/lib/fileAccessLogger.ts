import { NextRequest } from 'next/server'

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
    // Skip logging in server-side context to avoid fetch URL issues
    // This is just for debugging - in production you'd use a proper logging service
    console.log('📝 File access log:', logData)
  } catch (error) {
    console.error('Error logging file access:', error)
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
