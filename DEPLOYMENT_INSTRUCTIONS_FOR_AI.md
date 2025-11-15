# 🤖 Deployment Instructions for AI Assistant

This document contains step-by-step instructions for deploying the AB AMS application to Vercel.

## Current Application State

- **Framework**: Next.js 15.5.4
- **Database**: PostgreSQL (Prisma ORM)
- **Deployment Target**: Vercel
- **Admin Credentials**: 
  - Email: `aleksacoach@gmail.com`
  - Password: `Teodor2025`
  - Role: `ADMIN`

## Pre-Deployment Checklist

### 1. Verify Application Structure
- ✅ `package.json` exists with all dependencies
- ✅ `prisma/schema.prisma` exists
- ✅ `vercel.json` exists
- ✅ `next.config.ts` exists
- ✅ `scripts/seed.ts` exists with correct admin credentials

### 2. Environment Variables Required

The following environment variables MUST be set in Vercel:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Authentication (REQUIRED)
JWT_SECRET=<generate-32-char-secret>
NEXTAUTH_SECRET=<generate-32-char-secret>

# URLs (REQUIRED - update after deployment)
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=AB AMS

# Development Mode (REQUIRED)
LOCAL_DEV_MODE=false

# Optional
RESEND_API_KEY=<optional>
BLOB_READ_WRITE_TOKEN=<optional>
```

## Deployment Steps

### Step 1: Database Setup
1. User needs to create PostgreSQL database (Vercel Postgres, Supabase, or Neon)
2. Get `DATABASE_URL` and `DIRECT_URL` from database provider
3. Both URLs should be the same for most providers

### Step 2: Generate Secrets
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### Step 3: Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
vercel login
vercel
# Follow prompts, then:
vercel --prod
```

**Option B: Via GitHub**
1. Push code to GitHub
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Deploy

### Step 4: Set Environment Variables in Vercel
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all required variables (see list above)
3. Make sure `LOCAL_DEV_MODE=false` for production

### Step 5: Run Database Migrations
After first deployment:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

Or via Vercel Dashboard:
- Go to deployment → Functions → Run command
- Run: `npx prisma migrate deploy`

### Step 6: Seed Database
```bash
npm run db:seed
```

This creates:
- Admin user: `aleksacoach@gmail.com` / `Teodor2025`

### Step 7: Verify Deployment
1. Visit deployment URL
2. Go to `/login`
3. Login with admin credentials
4. Verify dashboard loads
5. Test key features

## Important Files

- `DEPLOYMENT.md` - Full deployment guide for user
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `.env.example` - Example environment variables
- `vercel.json` - Vercel configuration
- `next.config.ts` - Next.js configuration
- `scripts/seed.ts` - Database seeding script

## Common Issues & Solutions

### Issue: Build fails with Prisma error
**Solution**: Ensure `postinstall` script in package.json runs `prisma generate`

### Issue: Database connection fails
**Solution**: 
- Verify DATABASE_URL is correct
- Check SSL mode (`?sslmode=require`)
- Verify database is accessible

### Issue: LOCAL_DEV_MODE still active
**Solution**: Set `LOCAL_DEV_MODE=false` in Vercel environment variables

### Issue: Admin user not created
**Solution**: Run `npm run db:seed` after migrations

## Post-Deployment Tasks

1. ✅ Verify admin login works
2. ✅ Change admin password (security)
3. ✅ Create additional users
4. ✅ Configure wellness survey settings
5. ✅ Test file uploads
6. ✅ Test chat functionality
7. ✅ Test notifications

## Notes for AI Assistant

- Always check `LOCAL_DEV_MODE` is set to `false` in production
- Database migrations must run before seeding
- Admin credentials are in `scripts/seed.ts`
- All environment variables must be set in Vercel Dashboard
- Build command: `npm run build` (includes Prisma generate)
- Never commit `.env` files

## Current Status

- ✅ Code ready for deployment
- ✅ Seed script configured with correct credentials
- ✅ Vercel configuration ready
- ✅ Next.js config optimized for production
- ⏳ Waiting for database setup
- ⏳ Waiting for deployment

---

**Last Updated**: November 15, 2025
**Ready for Deployment**: YES ✅

