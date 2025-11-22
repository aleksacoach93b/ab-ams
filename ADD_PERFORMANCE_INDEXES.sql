-- Add performance indexes to database
-- Run this SQL in Supabase SQL Editor to improve query performance

-- Indexes for events table (most critical for performance)
CREATE INDEX IF NOT EXISTS "events_startTime_idx" ON "events"("startTime");
CREATE INDEX IF NOT EXISTS "events_coachId_idx" ON "events"("coachId");
CREATE INDEX IF NOT EXISTS "events_teamId_idx" ON "events"("teamId");
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events"("type");

-- Indexes for notifications table (critical for user notifications)
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

-- Indexes for event_participants (for faster event filtering)
CREATE INDEX IF NOT EXISTS "event_participants_eventId_idx" ON "event_participants"("eventId");
CREATE INDEX IF NOT EXISTS "event_participants_playerId_idx" ON "event_participants"("playerId");
CREATE INDEX IF NOT EXISTS "event_participants_staffId_idx" ON "event_participants"("staffId");

-- Indexes for chat_room_participants (for faster chat room queries)
CREATE INDEX IF NOT EXISTS "chat_room_participants_userId_idx" ON "chat_room_participants"("userId");
CREATE INDEX IF NOT EXISTS "chat_room_participants_roomId_idx" ON "chat_room_participants"("roomId");
CREATE INDEX IF NOT EXISTS "chat_room_participants_userId_isActive_idx" ON "chat_room_participants"("userId", "isActive");

-- Indexes for chat_messages (for faster message queries)
CREATE INDEX IF NOT EXISTS "chat_messages_roomId_idx" ON "chat_messages"("roomId");
CREATE INDEX IF NOT EXISTS "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- Indexes for daily_player_analytics (for faster CSV exports)
CREATE INDEX IF NOT EXISTS "daily_player_analytics_playerId_idx" ON "daily_player_analytics"("playerId");
CREATE INDEX IF NOT EXISTS "daily_player_analytics_date_idx" ON "daily_player_analytics"("date");

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('events', 'notifications', 'event_participants', 'chat_room_participants', 'chat_messages', 'daily_player_analytics')
ORDER BY tablename, indexname;

