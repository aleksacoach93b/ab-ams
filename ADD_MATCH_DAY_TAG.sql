-- Add matchDayTag column to players table
ALTER TABLE "players" 
ADD COLUMN IF NOT EXISTS "matchDayTag" TEXT;

-- Add comment to the column
COMMENT ON COLUMN "players"."matchDayTag" IS 'Match day tag for player (e.g., "Match Day +1", "Match Day -1", etc.)';

