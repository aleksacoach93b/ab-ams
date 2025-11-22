-- Complete fix for matchDayTag for 20.11 and 21.11 for ALL players
-- This script will:
-- 1. Create daily_player_analytics entries for all players for these dates if they don't exist
-- 2. Update matchDayTag for all players for these dates
-- Run this SQL in Supabase SQL Editor

-- Step 1: Create entries for 20.11.2025 for all players who don't have them
INSERT INTO "daily_player_analytics" ("id", "playerId", "date", "status", "matchDayTag", "notes", "createdAt")
SELECT 
  gen_random_uuid()::text as id,
  p.id as playerId,
  '2025-11-20'::date as date,
  COALESCE(
    (SELECT "status" FROM "daily_player_analytics" dpa2 
     WHERE dpa2."playerId" = p.id 
     AND dpa2."date" < '2025-11-20'::date 
     ORDER BY dpa2."date" DESC 
     LIMIT 1),
    'Fully Available'
  ) as status,
  'Match Day -3' as matchDayTag,
  NULL as notes,
  NOW() as createdAt
FROM "players" p
WHERE NOT EXISTS (
  SELECT 1 FROM "daily_player_analytics" dpa
  WHERE dpa."playerId" = p.id 
  AND DATE(dpa."date") = '2025-11-20'
);

-- Step 2: Create entries for 21.11.2025 for all players who don't have them
INSERT INTO "daily_player_analytics" ("id", "playerId", "date", "status", "matchDayTag", "notes", "createdAt")
SELECT 
  gen_random_uuid()::text as id,
  p.id as playerId,
  '2025-11-21'::date as date,
  COALESCE(
    (SELECT "status" FROM "daily_player_analytics" dpa2 
     WHERE dpa2."playerId" = p.id 
     AND dpa2."date" < '2025-11-21'::date 
     ORDER BY dpa2."date" DESC 
     LIMIT 1),
    'Fully Available'
  ) as status,
  'Match Day -2' as matchDayTag,
  NULL as notes,
  NOW() as createdAt
FROM "players" p
WHERE NOT EXISTS (
  SELECT 1 FROM "daily_player_analytics" dpa
  WHERE dpa."playerId" = p.id 
  AND DATE(dpa."date") = '2025-11-21'
);

-- Step 3: Update matchDayTag for 20.11.2025 for ALL players (even if they already have entries)
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day -3'
WHERE DATE("date") = '2025-11-20';

-- Step 4: Update matchDayTag for 21.11.2025 for ALL players (even if they already have entries)
UPDATE "daily_player_analytics"
SET "matchDayTag" = 'Match Day -2'
WHERE DATE("date") = '2025-11-21';

-- Step 5: Verify the updates
SELECT 
  DATE("date") as date,
  "matchDayTag",
  COUNT(*) as player_count
FROM "daily_player_analytics"
WHERE DATE("date") IN ('2025-11-20', '2025-11-21')
GROUP BY DATE("date"), "matchDayTag"
ORDER BY DATE("date"), "matchDayTag";

-- Step 6: Check if all players have entries
SELECT 
  DATE("date") as date,
  COUNT(DISTINCT "playerId") as total_players,
  (SELECT COUNT(*) FROM "players") as all_players_count
FROM "daily_player_analytics"
WHERE DATE("date") IN ('2025-11-20', '2025-11-21')
GROUP BY DATE("date")
ORDER BY DATE("date");

