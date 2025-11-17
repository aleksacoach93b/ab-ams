-- AlterEnum
-- Add new values to EventType enum
-- Note: PostgreSQL requires each ALTER TYPE ... ADD VALUE to be in a separate transaction
-- However, we can use IF NOT EXISTS to avoid errors if values already exist

DO $$ 
BEGIN
    -- Check and add REST if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REST' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'REST';
    END IF;
    
    -- Check and add LB_GYM if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LB_GYM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'LB_GYM';
    END IF;
    
    -- Check and add UB_GYM if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UB_GYM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'UB_GYM';
    END IF;
    
    -- Check and add PRE_ACTIVATION if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRE_ACTIVATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'PRE_ACTIVATION';
    END IF;
    
    -- Check and add REHAB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REHAB' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'REHAB';
    END IF;
    
    -- Check and add STAFF_MEETING if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STAFF_MEETING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'STAFF_MEETING';
    END IF;
    
    -- Check and add VIDEO_ANALYSIS if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIDEO_ANALYSIS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'VIDEO_ANALYSIS';
    END IF;
    
    -- Check and add DAY_OFF if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DAY_OFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'DAY_OFF';
    END IF;
    
    -- Check and add TRAVEL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRAVEL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'TRAVEL';
    END IF;
END $$;

