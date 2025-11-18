import { prisma } from './prisma'

export interface CreateNotificationData {
  title: string
  message: string
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category?: 'SYSTEM' | 'PLAYER' | 'EVENT' | 'WELLNESS' | 'CHAT' | 'REPORT' | 'GENERAL'
  userIds?: string[] // If not provided, sends to all users
  relatedId?: string
  relatedType?: string
}

export class NotificationService {
  static async createNotification(data: CreateNotificationData) {
    try {
      let targetUserIds: string[] = []
      
      if (data.userIds && data.userIds.length > 0) {
        targetUserIds = data.userIds
      } else {
        // Send to all active users
        const allUsers = await prisma.users.findMany({
          where: { isActive: true },
          select: { id: true }
        })
        targetUserIds = allUsers.map(u => u.id)
      }

      // Create notifications for all target users
      const notifications = await Promise.all(
        targetUserIds.map(async (userId) => {
          try {
            const notificationData: any = {
              id: `notif_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`,
              title: data.title,
              message: data.message,
              type: 'GENERAL' as any, // Use enum value
              userId
            }
            
            // Add optional fields if they exist in schema
            if (data.category) {
              notificationData.category = data.category
            }
            if (data.priority) {
              notificationData.priority = data.priority
            }
            if (data.relatedId) {
              notificationData.relatedId = data.relatedId
            }
            if (data.relatedType) {
              notificationData.relatedType = data.relatedType
            }
            
            return await prisma.notifications.create({
              data: notificationData
            })
          } catch (error: any) {
            console.error(`Error creating notification for user ${userId}:`, error)
            // If category field doesn't exist, try without it
            if (error.message?.includes('category') || error.message?.includes('Unknown field')) {
              return await prisma.notifications.create({
                data: {
                  id: `notif_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`,
                  title: data.title,
                  message: data.message,
                  type: 'GENERAL' as any,
                  userId
                }
              })
            }
            throw error
          }
        })
      )

      return notifications
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Event-related notifications
  static async notifyEventCreated(eventId: string, eventTitle: string, createdBy: string) {
    return this.createNotification({
      title: 'New Event Created',
      message: `"${eventTitle}" has been scheduled`,
      type: 'INFO',
      category: 'EVENT',
      relatedId: eventId,
      relatedType: 'event'
    })
  }

  static async notifyEventUpdated(eventId: string, eventTitle: string) {
    return this.createNotification({
      title: 'Event Updated',
      message: `"${eventTitle}" has been modified`,
      type: 'INFO',
      category: 'EVENT',
      relatedId: eventId,
      relatedType: 'event'
    })
  }

  static async notifyEventCancelled(eventId: string, eventTitle: string) {
    return this.createNotification({
      title: 'Event Cancelled',
      message: `"${eventTitle}" has been cancelled`,
      type: 'WARNING',
      category: 'EVENT',
      relatedId: eventId,
      relatedType: 'event'
    })
  }

  // Player-related notifications
  static async notifyPlayerStatusChanged(playerId: string, playerName: string, newStatus: string) {
    // Get only staff users (ADMIN, COACH, STAFF) - exclude PLAYER role
    const staffUsers = await prisma.users.findMany({
      where: { 
        isActive: true,
        role: {
          in: ['ADMIN', 'COACH', 'STAFF']
        }
      },
      select: { id: true }
    })
    
    const staffUserIds = staffUsers.map(u => u.id)
    
    return this.createNotification({
      title: 'Player Status Update',
      message: `${playerName} is now ${newStatus}`,
      type: 'SUCCESS',
      category: 'PLAYER',
      relatedId: playerId,
      relatedType: 'player',
      userIds: staffUserIds
    })
  }

  static async notifyPlayerAdded(playerId: string, playerName: string) {
    return this.createNotification({
      title: 'New Player Added',
      message: `${playerName} has been added to the team`,
      type: 'SUCCESS',
      category: 'PLAYER',
      relatedId: playerId,
      relatedType: 'player'
    })
  }

  // Chat-related notifications
  static async notifyNewChatMessage(roomId: string, roomName: string, senderName: string, messagePreview: string, senderId?: string) {
    // Get all participants except the sender
    const participants = await prisma.chat_room_participants.findMany({
      where: {
        roomId,
        isActive: true
      },
      include: {
        users: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    // Filter out the sender from notifications
    const participantIds = participants
      .filter(p => !senderId || p.users.id !== senderId)
      .map(p => p.users.id)

    console.log('📱 Creating chat notification:', {
      roomId,
      roomName,
      senderName,
      senderId,
      participantIds,
      totalParticipants: participants.length
    })

    if (participantIds.length === 0) {
      console.warn('⚠️ No participants found for chat notification (excluding sender)')
      return []
    }

    const result = await this.createNotification({
      title: `New message in ${roomName}`,
      message: `${senderName}: ${messagePreview}`,
      type: 'INFO',
      category: 'CHAT',
      userIds: participantIds,
      relatedId: roomId,
      relatedType: 'chat'
    })

    console.log(`✅ Created ${result.length} chat notifications for room ${roomName}`)
    return result
  }

  static async notifyAddedToChat(roomId: string, roomName: string, userId: string) {
    return this.createNotification({
      title: 'Added to Chat',
      message: `You've been added to "${roomName}"`,
      type: 'INFO',
      category: 'CHAT',
      userIds: [userId],
      relatedId: roomId,
      relatedType: 'chat'
    })
  }

  // Report-related notifications
  static async notifyReportUploaded(reportId: string, reportName: string, uploadedBy: string) {
    return this.createNotification({
      title: 'New Report Uploaded',
      message: `${uploadedBy} uploaded "${reportName}"`,
      type: 'INFO',
      category: 'REPORT',
      relatedId: reportId,
      relatedType: 'report'
    })
  }

  // Player media notifications
  static async notifyPlayerMediaUploaded(playerId: string, playerName: string, fileCount: number, uploadedBy: string) {
    return this.createNotification({
      title: 'New Player Media Uploaded',
      message: `${uploadedBy} uploaded ${fileCount} file(s) for ${playerName}`,
      type: 'INFO',
      category: 'PLAYER',
      relatedId: playerId,
      relatedType: 'player'
    })
  }

  // Event media notifications
  static async notifyEventMediaUploaded(eventId: string, fileName: string, uploadedBy: string) {
    return this.createNotification({
      title: 'New Event Media Uploaded',
      message: `${uploadedBy} uploaded "${fileName}" to event`,
      type: 'INFO',
      category: 'EVENT',
      relatedId: eventId,
      relatedType: 'event'
    })
  }

  // Wellness-related notifications
  static async notifyWellnessReminder(playerIds: string[]) {
    return this.createNotification({
      title: 'Wellness Survey Reminder',
      message: 'Please complete today\'s wellness survey',
      type: 'WARNING',
      priority: 'MEDIUM',
      category: 'WELLNESS',
      userIds: playerIds
    })
  }

  // System notifications
  static async notifySystemMaintenance(message: string) {
    return this.createNotification({
      title: 'System Maintenance',
      message,
      type: 'INFO',
      category: 'SYSTEM',
      priority: 'HIGH'
    })
  }

  static async notifySystemError(message: string) {
    return this.createNotification({
      title: 'System Error',
      message,
      type: 'ERROR',
      category: 'SYSTEM',
      priority: 'URGENT'
    })
  }
}
