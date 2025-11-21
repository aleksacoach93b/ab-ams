-- Add matchDayTag column to daily_player_analytics table
-- Run this migration manually on your database

ALTER TABLE "daily_player_analytics" 
ADD COLUMN IF NOT EXISTS "matchDayTag" TEXT;

-- Add comment
COMMENT ON COLUMN "daily_player_analytics"."matchDayTag" IS 'Match Day Tag for the player on this specific date (historical data)';

