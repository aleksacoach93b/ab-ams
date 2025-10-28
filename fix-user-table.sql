-- Add name column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS name TEXT;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;

