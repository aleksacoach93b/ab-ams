-- AB Athlete Management System Database Setup
-- Run this script in Supabase SQL Editor

-- Create Enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COACH', 'PLAYER', 'STAFF');
CREATE TYPE "PlayerStatus" AS ENUM ('FULLY_AVAILABLE', 'PARTIAL_TRAINING', 'PARTIAL_TEAM_INDIVIDUAL', 'REHAB_INDIVIDUAL', 'NOT_AVAILABLE_INJURY', 'PARTIAL_ILLNESS', 'NOT_AVAILABLE_ILLNESS', 'INDIVIDUAL_WORK', 'RECOVERY', 'NOT_AVAILABLE_OTHER', 'DAY_OFF', 'NATIONAL_TEAM', 'PHYSIO_THERAPY', 'ACTIVE', 'INJURED', 'SUSPENDED', 'INACTIVE', 'RETIRED');
CREATE TYPE "EventType" AS ENUM ('TRAINING', 'MATCH', 'MEETING', 'MEDICAL', 'RECOVERY', 'MEAL', 'COFFEE', 'OTHER');
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'IMAGE', 'VIDEO', 'AUDIO', 'OTHER');
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER');
CREATE TYPE "NoteType" AS ENUM ('GENERAL', 'MEDICAL', 'PERFORMANCE', 'TACTICAL', 'PERSONAL');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'INJURED');
CREATE TYPE "WellnessDataType" AS ENUM ('WEIGHT', 'HEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'HEART_RATE', 'BLOOD_PRESSURE', 'SLEEP_HOURS', 'STRESS_LEVEL', 'MOOD', 'ENERGY_LEVEL', 'OTHER');
CREATE TYPE "NotificationType" AS ENUM ('EVENT_REMINDER', 'MEDIA_UPLOADED', 'NOTE_ADDED', 'WELLNESS_ALERT', 'ATTENDANCE_REMINDER', 'GENERAL');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- Create Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create Players table
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "avatar" TEXT,
    "position" TEXT,
    "jerseyNumber" INTEGER,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "preferredFoot" TEXT,
    "nationality" TEXT,
    "currentAddress" TEXT,
    "birthCity" TEXT,
    "birthCountry" TEXT,
    "bloodType" TEXT,
    "emergencyContact" TEXT,
    "medicalNotes" TEXT,
    "teamId" TEXT,
    "dateJoined" TIMESTAMP(3),
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- Create Coaches table
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "avatar" TEXT,
    "coachType" TEXT,
    "specialization" TEXT,
    "experience" INTEGER,
    "certifications" TEXT,
    "dailyMorningReport" BOOLEAN NOT NULL DEFAULT false,
    "morningReportTime" TEXT DEFAULT '08:00',
    "dailyEveningReport" BOOLEAN NOT NULL DEFAULT false,
    "eveningReportTime" TEXT DEFAULT '18:00',
    "eventReports" BOOLEAN NOT NULL DEFAULT true,
    "eventReportDelay" TEXT DEFAULT '1.5 hours',
    "weeklyReport" BOOLEAN NOT NULL DEFAULT false,
    "weeklyReportDay" TEXT DEFAULT 'Monday',
    "weeklyReportTime" TEXT DEFAULT '08:00',
    "monthlyReport" BOOLEAN NOT NULL DEFAULT false,
    "monthlyReportTime" TEXT DEFAULT '08:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- Create Staff table
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "avatar" TEXT,
    "position" TEXT,
    "department" TEXT,
    "experience" INTEGER,
    "certifications" TEXT,
    "canCreateEvents" BOOLEAN NOT NULL DEFAULT false,
    "canEditEvents" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteEvents" BOOLEAN NOT NULL DEFAULT false,
    "canViewAllPlayers" BOOLEAN NOT NULL DEFAULT true,
    "canEditPlayers" BOOLEAN NOT NULL DEFAULT false,
    "canDeletePlayers" BOOLEAN NOT NULL DEFAULT false,
    "canAddPlayerMedia" BOOLEAN NOT NULL DEFAULT false,
    "canEditPlayerMedia" BOOLEAN NOT NULL DEFAULT false,
    "canDeletePlayerMedia" BOOLEAN NOT NULL DEFAULT false,
    "canAddPlayerNotes" BOOLEAN NOT NULL DEFAULT false,
    "canEditPlayerNotes" BOOLEAN NOT NULL DEFAULT false,
    "canDeletePlayerNotes" BOOLEAN NOT NULL DEFAULT false,
    "canViewCalendar" BOOLEAN NOT NULL DEFAULT true,
    "canViewDashboard" BOOLEAN NOT NULL DEFAULT true,
    "canManageStaff" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- Create Teams table
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "color" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- Create Events table
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "teamId" TEXT,
    "coachId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "icon" TEXT,
    "allowPlayerCreation" BOOLEAN NOT NULL DEFAULT false,
    "allowPlayerReschedule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- Create Event Participants table
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT,
    "staffId" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- Create Login Logs table
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "location" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- Create Player Availability table
CREATE TABLE "player_availability" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "PlayerStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_availability_pkey" PRIMARY KEY ("id")
);

-- Create Report Folders table
CREATE TABLE "report_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "report_folders_pkey" PRIMARY KEY ("id")
);

-- Create Reports table
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "folderId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- Create Report Visibility table
CREATE TABLE "report_visibility" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "folderId" TEXT,
    "userId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_visibility_pkey" PRIMARY KEY ("id")
);

-- Create File Analytics table
CREATE TABLE "file_analytics" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_analytics_pkey" PRIMARY KEY ("id")
);

-- Create Sessions table
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "players_userId_key" ON "players"("userId");
CREATE UNIQUE INDEX "players_email_key" ON "players"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "coaches_userId_key" ON "coaches"("userId");
CREATE UNIQUE INDEX "coaches_email_key" ON "coaches"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE UNIQUE INDEX "player_availability_playerId_date_key" ON "player_availability"("playerId", "date");
CREATE UNIQUE INDEX "event_participants_eventId_playerId_key" ON "event_participants"("eventId", "playerId") WHERE "playerId" IS NOT NULL;
CREATE UNIQUE INDEX "event_participants_eventId_staffId_key" ON "event_participants"("eventId", "staffId") WHERE "staffId" IS NOT NULL;
CREATE UNIQUE INDEX "report_visibility_reportId_userId_key" ON "report_visibility"("reportId", "userId") WHERE "reportId" IS NOT NULL;
CREATE UNIQUE INDEX "report_visibility_folderId_userId_key" ON "report_visibility"("folderId", "userId") WHERE "folderId" IS NOT NULL;

-- Create foreign key constraints
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_availability" ADD CONSTRAINT "player_availability_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_folders" ADD CONSTRAINT "report_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "report_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "report_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_visibility" ADD CONSTRAINT "report_visibility_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_visibility" ADD CONSTRAINT "report_visibility_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "report_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_visibility" ADD CONSTRAINT "report_visibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_analytics" ADD CONSTRAINT "file_analytics_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_analytics" ADD CONSTRAINT "file_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
