-- First, add matchDayTag column to daily_player_analytics table
-- Run this SQL in Supabase SQL Editor FIRST

ALTER TABLE "daily_player_analytics" 
ADD COLUMN IF NOT EXISTS "matchDayTag" TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_player_analytics' AND column_name = 'matchDayTag';

