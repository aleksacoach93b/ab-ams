-- Manual SQL script to add missing EventType enum values
-- Run this in Supabase SQL Editor if migration hasn't been applied automatically

DO $$ 
BEGIN
    -- Check and add REST if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REST' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'REST';
        RAISE NOTICE 'Added REST to EventType enum';
    ELSE
        RAISE NOTICE 'REST already exists in EventType enum';
    END IF;
    
    -- Check and add LB_GYM if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LB_GYM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'LB_GYM';
        RAISE NOTICE 'Added LB_GYM to EventType enum';
    ELSE
        RAISE NOTICE 'LB_GYM already exists in EventType enum';
    END IF;
    
    -- Check and add UB_GYM if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UB_GYM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'UB_GYM';
        RAISE NOTICE 'Added UB_GYM to EventType enum';
    ELSE
        RAISE NOTICE 'UB_GYM already exists in EventType enum';
    END IF;
    
    -- Check and add PRE_ACTIVATION if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRE_ACTIVATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'PRE_ACTIVATION';
        RAISE NOTICE 'Added PRE_ACTIVATION to EventType enum';
    ELSE
        RAISE NOTICE 'PRE_ACTIVATION already exists in EventType enum';
    END IF;
    
    -- Check and add REHAB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REHAB' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'REHAB';
        RAISE NOTICE 'Added REHAB to EventType enum';
    ELSE
        RAISE NOTICE 'REHAB already exists in EventType enum';
    END IF;
    
    -- Check and add STAFF_MEETING if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STAFF_MEETING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'STAFF_MEETING';
        RAISE NOTICE 'Added STAFF_MEETING to EventType enum';
    ELSE
        RAISE NOTICE 'STAFF_MEETING already exists in EventType enum';
    END IF;
    
    -- Check and add VIDEO_ANALYSIS if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIDEO_ANALYSIS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'VIDEO_ANALYSIS';
        RAISE NOTICE 'Added VIDEO_ANALYSIS to EventType enum';
    ELSE
        RAISE NOTICE 'VIDEO_ANALYSIS already exists in EventType enum';
    END IF;
    
    -- Check and add DAY_OFF if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DAY_OFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'DAY_OFF';
        RAISE NOTICE 'Added DAY_OFF to EventType enum';
    ELSE
        RAISE NOTICE 'DAY_OFF already exists in EventType enum';
    END IF;
    
    -- Check and add TRAVEL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRAVEL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'TRAVEL';
        RAISE NOTICE 'Added TRAVEL to EventType enum';
    ELSE
        RAISE NOTICE 'TRAVEL already exists in EventType enum';
    END IF;
END $$;

-- Verify the enum values were added
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')
ORDER BY enumsortorder;

