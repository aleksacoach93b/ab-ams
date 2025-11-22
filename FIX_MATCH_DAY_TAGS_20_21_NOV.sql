-- Fix matchDayTag for 20.11 and 21.11 for all players
-- Run this SQL in Supabase SQL Editor

-- 20.11.2025 - Match Day -3 for all players
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day -3'
WHERE DATE("date") = '2025-11-20'
  AND ("matchDayTag" IS NULL OR "matchDayTag" != 'Match Day -3');

-- 21.11.2025 - Match Day -2 for all players
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day -2'
WHERE DATE("date") = '2025-11-21'
  AND ("matchDayTag" IS NULL OR "matchDayTag" != 'Match Day -2');

-- Verify the updates
SELECT 
  DATE("date") as date,
  "matchDayTag",
  COUNT(*) as player_count
FROM "daily_player_analytics"
WHERE DATE("date") IN ('2025-11-20', '2025-11-21')
GROUP BY DATE("date"), "matchDayTag"
ORDER BY DATE("date"), "matchDayTag";

