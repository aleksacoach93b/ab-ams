-- Add matchDayTag column to events table
-- Run this migration manually on your database

ALTER TABLE "events" 
ADD COLUMN IF NOT EXISTS "matchDayTag" TEXT;

-- Add comment
COMMENT ON COLUMN "events"."matchDayTag" IS 'Match Day Tag for the event';

