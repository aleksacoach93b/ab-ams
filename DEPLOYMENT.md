# 🚀 Deployment Guide - AB AMS Application

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] Vercel account (vercel.com)
- [ ] PostgreSQL database (Vercel Postgres, Supabase, or Neon)
- [ ] Environment variables prepared
- [ ] Domain name (optional)

---

## 🔧 Step 1: Database Setup

### Option A: Vercel Postgres (Recommended)
1. Go to Vercel Dashboard → Your Project → Storage
2. Click "Create Database" → Select "Postgres"
3. Copy the `DATABASE_URL` and `DIRECT_URL` from the database settings

### Option B: Supabase
1. Create account at supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string (URI format)
5. Use the same URL for both `DATABASE_URL` and `DIRECT_URL`

### Option C: Neon
1. Create account at neon.tech
2. Create new project
3. Copy connection string
4. Use the same URL for both `DATABASE_URL` and `DIRECT_URL`

---

## 🔐 Step 2: Environment Variables

### Required Environment Variables

Create these in Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
NEXTAUTH_SECRET=your-nextauth-secret-key-min-32-characters

# Application URLs
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=AB AMS

# Email (Optional - for notifications)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# File Storage (Optional - for media uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx

# Development Mode (Set to false for production)
LOCAL_DEV_MODE=false
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET (32+ characters)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32
```

---

## 📦 Step 3: Deploy to Vercel

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to project directory
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? ab-ams-app (or your choice)
# - Directory? ./
# - Override settings? N

# Deploy to production
vercel --prod
```

### Method 2: GitHub Integration

1. Push code to GitHub repository
2. Go to Vercel Dashboard → Add New Project
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add all environment variables
6. Click "Deploy"

---

## 🗄️ Step 4: Database Migration & Seeding

### Run Migrations

After deployment, run database migrations:

```bash
# Option 1: Via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Option 2: Via Vercel Dashboard
# Go to your deployment → Functions → Run command
# Or use Vercel CLI:
vercel exec -- npx prisma migrate deploy
```

### Seed Database (Create Admin User)

```bash
# Option 1: Via Vercel CLI
vercel exec -- npm run db:seed

# Option 2: Local with production DATABASE_URL
# Set DATABASE_URL in your local .env
npm run db:seed
```

**Admin Credentials After Seeding:**
- Email: `aleksacoach@gmail.com`
- Password: `Teodor2025`
- Role: `ADMIN`

---

## 🔍 Step 5: Verify Deployment

### Check Deployment Status
1. Go to Vercel Dashboard → Your Project
2. Check latest deployment status
3. Click on deployment to see logs

### Test Application
1. Visit your deployment URL: `https://your-app.vercel.app`
2. Go to `/login`
3. Login with admin credentials
4. Verify all features work:
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Can create players
   - [ ] Can create events
   - [ ] Chat works
   - [ ] Notifications work
   - [ ] File uploads work

---

## 🛠️ Step 6: Post-Deployment Configuration

### Update Next.js Config for Production

The `next.config.ts` should automatically use production settings, but verify:

```typescript
// For production, images should be optimized
images: {
  domains: ['your-app.vercel.app'],
  unoptimized: false,
}
```

### Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` environment variables

---

## 🔄 Step 7: Continuous Deployment

### Automatic Deployments
- Every push to `main` branch → Production deployment
- Every push to other branches → Preview deployment

### Manual Deployments
```bash
vercel --prod
```

---

## 🐛 Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
```bash
# Solution: Add to package.json postinstall script
"postinstall": "npx prisma generate"
```

**Error: Database connection failed**
- Check `DATABASE_URL` is correct
- Verify database is accessible (not blocked by firewall)
- Check SSL mode in connection string

**Error: JWT_SECRET missing**
- Add `JWT_SECRET` to environment variables
- Ensure it's at least 32 characters long

### Runtime Errors

**Error: LOCAL_DEV_MODE is true**
- Set `LOCAL_DEV_MODE=false` in environment variables
- Redeploy application

**Error: Cannot find module**
- Check all dependencies are in `package.json`
- Run `npm install` locally to verify

### Database Issues

**Migrations not running**
```bash
# Force run migrations
npx prisma migrate deploy --force
```

**Seed script fails**
- Verify DATABASE_URL is correct
- Check database permissions
- Ensure all tables exist (run migrations first)

---

## 📊 Monitoring & Logs

### View Logs
1. Vercel Dashboard → Your Project → Logs
2. Or via CLI: `vercel logs`

### Monitor Performance
- Vercel Dashboard → Analytics
- Check function execution times
- Monitor database connections

---

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is strong and unique
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `LOCAL_DEV_MODE=false` in production
- [ ] All environment variables are set
- [ ] Admin password is changed after first login
- [ ] HTTPS is enabled (automatic on Vercel)

---

## 📝 Important Notes

1. **Never commit `.env` files** - Use Vercel environment variables
2. **Database backups** - Set up automatic backups for production database
3. **Admin account** - Change password after first login
4. **File storage** - Configure Vercel Blob or external storage for media files
5. **Email service** - Configure Resend or similar for email notifications

---

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check database connection
3. Verify all environment variables
4. Review this deployment guide
5. Check application logs in Vercel dashboard

---

## ✅ Deployment Complete!

Once deployed, your application will be available at:
- **Production**: `https://your-app.vercel.app`
- **Admin Login**: `https://your-app.vercel.app/login`
- **Email**: `aleksacoach@gmail.com`
- **Password**: `Teodor2025`

**Next Steps:**
1. Login and change admin password
2. Create additional users (coaches, players, staff)
3. Configure wellness survey settings
4. Set up file storage for media uploads
5. Configure email notifications (optional)

---

**Last Updated**: November 15, 2025
**Version**: 1.0.0

