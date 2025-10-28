-- Create LoginLog table
CREATE TABLE "LoginLog" (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "LoginLog_pkey" PRIMARY KEY (id)
);

-- Verify the table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'LoginLog';

