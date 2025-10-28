import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedNotifications() {
  try {
    console.log('🌱 Seeding notifications...')

    // Get all users
    const users = await prisma.user.findMany({
      where: { isActive: true }
    })

    if (users.length === 0) {
      console.log('❌ No users found. Please run the main seed script first.')
      return
    }

    // Create sample notifications for each user
    const notifications = [
      {
        title: 'Welcome to AB Athletes!',
        message: 'Your account has been successfully set up. You can now access all features of the athlete management system.',
        type: 'SUCCESS' as const,
        priority: 'MEDIUM' as const,
        category: 'SYSTEM' as const,
        isRead: false
      },
      {
        title: 'System Update Available',
        message: 'A new version of the application is available with improved performance and new features.',
        type: 'INFO' as const,
        priority: 'LOW' as const,
        category: 'SYSTEM' as const,
        isRead: true
      },
      {
        title: 'Wellness Survey Reminder',
        message: 'Please complete today\'s wellness survey to help us track your health and performance.',
        type: 'WARNING' as const,
        priority: 'MEDIUM' as const,
        category: 'WELLNESS' as const,
        isRead: false
      }
    ]

    // Create notifications for all users
    for (const user of users) {
      for (const notification of notifications) {
        await prisma.notification.create({
          data: {
            ...notification,
            userId: user.id
          }
        })
      }
    }

    console.log(`✅ Created ${notifications.length * users.length} notifications for ${users.length} users`)

    // Create some event-specific notifications
    const events = await prisma.events.findMany({
      take: 3
    })

    for (const event of events) {
      for (const user of users) {
        await prisma.notification.create({
          data: {
            title: 'New Event Scheduled',
            message: `"${event.title}" has been scheduled for ${new Date(event.date).toLocaleDateString()}`,
            type: 'INFO',
            priority: 'MEDIUM',
            category: 'EVENT',
            userId: user.id,
            relatedId: event.id,
            relatedType: 'event',
            isRead: false
          }
        })
      }
    }

    console.log(`✅ Created ${events.length * users.length} event notifications`)

    // Create some player-specific notifications
    const players = await prisma.player.findMany({
      take: 2
    })

    for (const player of players) {
      for (const user of users) {
        await prisma.notification.create({
          data: {
            title: 'Player Status Update',
            message: `${player.name} is now ${player.status.toLowerCase()}`,
            type: 'SUCCESS',
            priority: 'LOW',
            category: 'PLAYER',
            userId: user.id,
            relatedId: player.id,
            relatedType: 'player',
            isRead: true
          }
        })
      }
    }

    console.log(`✅ Created ${players.length * users.length} player notifications`)

    console.log('🎉 Notification seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding notifications:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedNotifications()
