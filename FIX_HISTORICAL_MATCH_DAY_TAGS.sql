-- Fix historical matchDayTag for specific dates
-- Run this SQL in Supabase SQL Editor

-- 19.11.2025 - Match Day +4 for all players
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day +4'
WHERE DATE("date") = '2025-11-19'
  AND "matchDayTag" IS NULL OR "matchDayTag" != 'Match Day +4';

-- 20.11.2025 - Match Day -3 for all players
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day -3'
WHERE DATE("date") = '2025-11-20'
  AND "matchDayTag" IS NULL OR "matchDayTag" != 'Match Day -3';

-- Verify the updates
SELECT 
  DATE("date") as date,
  "matchDayTag",
  COUNT(*) as player_count
FROM "daily_player_analytics"
WHERE DATE("date") IN ('2025-11-19', '2025-11-20')
GROUP BY DATE("date"), "matchDayTag"
ORDER BY DATE("date"), "matchDayTag";

