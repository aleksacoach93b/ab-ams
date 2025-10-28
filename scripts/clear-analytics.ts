import { prisma } from '../src/lib/prisma'

async function clearAnalytics() {
  try {
    console.log('🧹 Clearing existing analytics data...')

    // Clear existing analytics
    const deletedEventAnalytics = await prisma.dailyEventAnalytics.deleteMany({})
    console.log(`🗑️ Deleted ${deletedEventAnalytics.count} event analytics records`)

    const deletedPlayerAnalytics = await prisma.dailyPlayerAnalytics.deleteMany({})
    console.log(`🗑️ Deleted ${deletedPlayerAnalytics.count} player analytics records`)

    console.log('✅ Analytics data cleared successfully!')

  } catch (error) {
    console.error('❌ Error clearing analytics:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAnalytics()
