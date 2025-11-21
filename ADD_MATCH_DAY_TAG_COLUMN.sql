-- Add matchDayTag column to events table
-- Run this SQL command in your database

ALTER TABLE "events" 
ADD COLUMN IF NOT EXISTS "matchDayTag" TEXT;

-- Verify the column was added (optional check)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'matchDayTag';

