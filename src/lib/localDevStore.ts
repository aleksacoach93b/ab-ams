import { promises as fs } from 'fs'
import path from 'path'

export type StoredPlayer = {
  id: string
  name: string
  email: string
  position?: string
  status?: string
}

export type StoredPlayerUser = {
  id: string
  email: string
  password: string // hashed password
  firstName: string
  lastName: string
  role: 'PLAYER'
  isActive: boolean
  playerId: string // Reference to player
}

export type Notification = {
  id: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category: 'SYSTEM' | 'PLAYER' | 'EVENT' | 'WELLNESS' | 'CHAT' | 'REPORT' | 'GENERAL'
  userId: string
  relatedId?: string | null
  relatedType?: string | null
  isRead: boolean
  createdAt: string
  updatedAt: string
}

type MediaFile = {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  thumbnailUrl: string | null
  uploadedAt: string
  tags: string[]
}

type PlayerNote = {
  id: string
  playerId: string
  createdBy: string
  title: string | null
  content: string
  type: string
  isVisibleToPlayer: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
  }
}

type ReportFolder = {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  parent?: ReportFolder | null
  children: ReportFolder[]
  reports: any[]
  visibleToStaff: any[]
  _count: {
    reports: number
    children: number
  }
}

type PlayerReportFolder = {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  parent?: PlayerReportFolder | null
  children: PlayerReportFolder[]
  reports: any[]
  visibleToPlayers: any[]
  _count: {
    reports: number
    children: number
  }
}

type StoredStaff = {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  password?: string
  phone?: string
  position?: string
  imageUrl?: string | null
  canViewReports: boolean
  canEditReports: boolean
  canDeleteReports: boolean
  canCreateEvents: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canViewAllPlayers: boolean
  canEditPlayers: boolean
  canDeletePlayers: boolean
  canAddPlayerMedia: boolean
  canEditPlayerMedia: boolean
  canDeletePlayerMedia: boolean
  canAddPlayerNotes: boolean
  canEditPlayerNotes: boolean
  canDeletePlayerNotes: boolean
  canViewCalendar: boolean
  canViewDashboard: boolean
  canManageStaff: boolean
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    lastLoginAt?: string | null
    createdAt: string
  }
  createdAt: string
  updatedAt: string
}

type EventParticipant = {
  id: string
  eventId: string
  playerId?: string | null
  staffId?: string | null
  role?: string | null
  player?: any
  staff?: any
}

type StoredEvent = {
  id: string
  title: string
  description?: string | null
  type: string
  date: string // ISO date string
  startTime: string
  endTime: string
  location?: string | null
  icon?: string | null
  iconName?: string | null
  color: string
  matchDayTag?: string | null
  isAllDay?: boolean
  isRecurring?: boolean
  allowPlayerCreation?: boolean
  allowPlayerReschedule?: boolean
  participants: EventParticipant[]
  media: any[]
  createdAt: string
  updatedAt: string
}

type PlayerReport = {
  id: string
  name: string
  description?: string | null
  folderId?: string | null
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  thumbnailUrl?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  folder?: PlayerReportFolder | null
}

type Report = {
  id: string
  name: string
  description?: string | null
  folderId?: string | null
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  thumbnailUrl?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  folder?: ReportFolder | null
}

type ChatRoom = {
  id: string
  name: string
  type: string
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  participants: Array<{
    id: string
    userId: string
    role: string
    isActive: boolean
    user?: {
      id: string
      name: string
      email: string
      role: string
    }
  }>
  messages: any[]
  lastMessage?: any
}

type DailyPlayerNote = {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  playerId: string
  playerName: string
  status: string
  reason: string
  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

type DailyEventAnalytics = {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  eventType: string // Event type label (e.g., "Training", "Match")
  count: number
  totalDuration: number // in minutes
  avgDuration: number // in minutes
  createdAt: string
  updatedAt: string
}

type DailyPlayerAnalytics = {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  playerId: string
  playerName: string
  activity: string // Activity/status label
  count: number
  createdAt: string
  updatedAt: string
}

type CoachNote = {
  id: string
  title: string
  content: string
  isPinned: boolean
  authorId: string
  createdAt: string
  updatedAt: string
  visibleToStaff: Array<{
    id: string
    staffId: string
    canView: boolean
    staff?: {
      id: string
      name: string
      email: string
    }
  }>
}

type LocalDevState = {
  playerTags: Record<string, string | null>
  playerAvatars: Record<string, string | null>
  playerMediaFiles: Record<string, MediaFile[]>
  playerNotes: Record<string, PlayerNote[]>
  dailyPlayerNotes: DailyPlayerNote[] // Daily player notes for analytics
  dailyEventAnalytics: DailyEventAnalytics[] // Daily event analytics
  dailyPlayerAnalytics: DailyPlayerAnalytics[] // Daily player analytics
  reportFolders: Record<string, ReportFolder[]> // Key: parentId or 'root'
  playerReportFolders: Record<string, PlayerReportFolder[]> // Key: parentId or 'root'
  playerReports: PlayerReport[] // All player reports
  reports: Report[] // All staff/admin reports
  coachNotes: CoachNote[] // All coach notes
  players: StoredPlayer[]
  playerUsers: StoredPlayerUser[] // Player user accounts for login
  staff: StoredStaff[]
  events: StoredEvent[]
  chatRooms: ChatRoom[] // All chat rooms
  notifications: Notification[] // All notifications
  wellnessSettings: {
    csvUrl: string // CSV export URL for wellness data
    surveyId: string // Survey ID for kiosk links
    baseUrl: string // Base URL for wellness app
  }
}

const STATE_DIR = path.join(process.cwd(), '.local-dev')
const STATE_FILE = path.join(STATE_DIR, 'state.json')

async function ensureStateFile(): Promise<void> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true })
    const exists = await fs
      .access(STATE_FILE)
      .then(() => true)
      .catch(() => false)
    if (!exists) {
      const initial: LocalDevState = { 
        playerTags: {}, 
        playerAvatars: {}, 
        playerMediaFiles: {}, 
        playerNotes: {}, 
        dailyPlayerNotes: [], 
        dailyEventAnalytics: [], 
        dailyPlayerAnalytics: [], 
        reportFolders: {}, 
        playerReportFolders: {}, 
        playerReports: [], 
        reports: [], 
        coachNotes: [], 
        players: [], 
        playerUsers: [], 
        staff: [], 
        events: [], 
        chatRooms: [], 
        notifications: [],
        wellnessSettings: {
          csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
          surveyId: 'cmg6klyig0004l704u1kd78zb',
          baseUrl: 'https://wellness-monitor-tan.vercel.app'
        }
      }
      await fs.writeFile(STATE_FILE, JSON.stringify(initial, null, 2), 'utf8')
    }
  } catch (_) {
    // ignore
  }
}

export async function readState(): Promise<LocalDevState> {
  try {
    await ensureStateFile()
    const raw = await fs.readFile(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      playerTags: parsed.playerTags || {},
      playerAvatars: parsed.playerAvatars || {},
      playerMediaFiles: parsed.playerMediaFiles || {},
      playerNotes: parsed.playerNotes || {},
      dailyPlayerNotes: parsed.dailyPlayerNotes || [],
      dailyEventAnalytics: parsed.dailyEventAnalytics || [],
      dailyPlayerAnalytics: parsed.dailyPlayerAnalytics || [],
      reportFolders: parsed.reportFolders || {},
      playerReportFolders: parsed.playerReportFolders || {},
      playerReports: parsed.playerReports || [],
      reports: parsed.reports || [],
      coachNotes: parsed.coachNotes || [],
      players: parsed.players || [],
      playerUsers: parsed.playerUsers || [],
      staff: parsed.staff || [],
      events: parsed.events || [],
      chatRooms: parsed.chatRooms || [],
      notifications: parsed.notifications || [],
      wellnessSettings: parsed.wellnessSettings || {
        csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
        surveyId: 'cmg6klyig0004l704u1kd78zb',
        baseUrl: 'https://wellness-monitor-tan.vercel.app'
      }
    }
  } catch (_) {
    return { 
      playerTags: {}, 
      playerAvatars: {}, 
      playerMediaFiles: {}, 
      playerNotes: {}, 
      dailyPlayerNotes: [], 
      dailyEventAnalytics: [], 
      dailyPlayerAnalytics: [], 
      reportFolders: {}, 
      playerReportFolders: {}, 
      playerReports: [], 
      reports: [], 
      coachNotes: [], 
      players: [], 
      playerUsers: [], 
      staff: [], 
      events: [], 
      chatRooms: [], 
      notifications: [],
      wellnessSettings: {
        csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
        surveyId: 'cmg6klyig0004l704u1kd78zb',
        baseUrl: 'https://wellness-monitor-tan.vercel.app'
      }
    }
  }
}

export async function writeState(state: LocalDevState): Promise<void> {
  try {
    await ensureStateFile()
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
  } catch (_) {
    // ignore
  }
}

export async function setMatchDayTag(playerId: string, tag: string | null): Promise<void> {
  const state = await readState()
  state.playerTags[playerId] = tag
  await writeState(state)
}

export async function setMatchDayTagsBulk(playerIds: string[], tag: string | null): Promise<void> {
  const state = await readState()
  for (const id of playerIds) {
    state.playerTags[id] = tag
  }
  await writeState(state)
}

export async function getMatchDayTag(playerId: string): Promise<string | null> {
  const state = await readState()
  return state.playerTags[playerId] ?? null
}

export async function addPlayer(player: StoredPlayer): Promise<void> {
  const state = await readState()
  state.players.push(player)
  await writeState(state)
}

export async function getPlayers(): Promise<StoredPlayer[]> {
  const state = await readState()
  return state.players
}

export async function initializePlayerUsers(): Promise<void> {
  const state = await readState()
  
  if (!state.playerUsers) {
    state.playerUsers = []
  }
  
  // Only initialize player users for players that exist in state.players
  // This ensures we don't create users for deleted players
  for (const player of state.players) {
    const existingUser = state.playerUsers.find(u => u.playerId === player.id)
    
    if (!existingUser) {
      const nameParts = player.name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      state.playerUsers.push({
        id: `local-player-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: player.email,
        password: 'player123', // Default password for LOCAL_DEV_MODE
        firstName,
        lastName,
        role: 'PLAYER',
        isActive: true,
        playerId: player.id
      })
    }
  }
  
  // Remove any orphaned player users (users without corresponding players)
  state.playerUsers = state.playerUsers.filter(user => 
    state.players.some(player => player.id === user.playerId)
  )
  
  await writeState(state)
}

export async function syncPlayerUserEmail(playerId: string, email: string, name?: string, password?: string): Promise<void> {
  const state = await readState()
  
  if (!state.playerUsers) {
    state.playerUsers = []
  }
  
  // Find player user by playerId
  const playerUserIndex = state.playerUsers.findIndex(u => u.playerId === playerId)
  
  if (playerUserIndex !== -1) {
    // Update existing player user email
    const existingUser = state.playerUsers[playerUserIndex]
    
    // Check if email already exists for another user
    const emailExists = state.playerUsers.some((u, idx) => 
      idx !== playerUserIndex && u.email.toLowerCase() === email.toLowerCase()
    )
    
    if (!emailExists) {
      // Update email, name, and password if provided
      state.playerUsers[playerUserIndex] = {
        ...existingUser,
        email: email,
        password: password || existingUser.password, // Update password if provided, otherwise keep existing
        firstName: name ? name.split(' ')[0] || existingUser.firstName : existingUser.firstName,
        lastName: name ? name.split(' ').slice(1).join(' ') || existingUser.lastName : existingUser.lastName
      }
      await writeState(state)
    }
  } else {
    // Create new player user if it doesn't exist
    const nameParts = name ? name.split(' ') : ['Player', '']
    const firstName = nameParts[0] || 'Player'
    const lastName = nameParts.slice(1).join(' ') || ''
    
    state.playerUsers.push({
      id: `local-player-user-${playerId.replace('local-player-', '')}`,
      email: email,
      password: password || 'player123', // Use provided password or default
      firstName,
      lastName,
      role: 'PLAYER',
      isActive: true,
      playerId: playerId
    })
    await writeState(state)
  }
}

// Helper function to create notifications in LOCAL_DEV_MODE
export async function createNotification(data: {
  title: string
  message: string
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category?: 'SYSTEM' | 'PLAYER' | 'EVENT' | 'WELLNESS' | 'CHAT' | 'REPORT' | 'GENERAL'
  userIds?: string[] // If not provided, sends to all active users
  relatedId?: string
  relatedType?: string
}): Promise<Notification[]> {
  const state = await readState()
  
  // Get target user IDs
  let targetUserIds: string[] = []
  
  if (data.userIds && data.userIds.length > 0) {
    targetUserIds = data.userIds
    console.log(`📱 [CREATE NOTIFICATION] Using provided userIds:`, targetUserIds)
  } else {
    // Send to all active users (players + staff)
    const allPlayerUserIds = (state.playerUsers || []).map(u => u.id)
    const allStaffUserIds = (state.staff || [])
      .map(s => s.user?.id || s.id)
      .filter((id): id is string => !!id) // Remove null/undefined
    targetUserIds = [...allPlayerUserIds, ...allStaffUserIds]
    console.log(`📱 [CREATE NOTIFICATION] No userIds provided, using all users:`, targetUserIds.length)
  }
  
  if (targetUserIds.length === 0) {
    console.warn(`⚠️ [CREATE NOTIFICATION] No target user IDs found!`)
    return []
  }
  
  const now = new Date().toISOString()
  const timestamp = Date.now()
  const newNotifications: Notification[] = targetUserIds.map((userId, index) => ({
    id: `notif_${timestamp}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    title: data.title,
    message: data.message,
    type: data.type || 'INFO',
    priority: data.priority || 'MEDIUM',
    category: data.category || 'GENERAL',
    userId,
    relatedId: data.relatedId || null,
    relatedType: data.relatedType || null,
    isRead: false,
    createdAt: now,
    updatedAt: now
  }))
  
  // Ensure notifications array exists
  if (!state.notifications) {
    state.notifications = []
  }
  
  state.notifications = [...state.notifications, ...newNotifications]
  await writeState(state)
  
  console.log(`📱 [CREATE NOTIFICATION] Created ${newNotifications.length} notifications for userIds:`, targetUserIds)
  console.log(`📱 [CREATE NOTIFICATION] Total notifications in state now:`, state.notifications.length)
  
  return newNotifications
}

