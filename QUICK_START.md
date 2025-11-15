# 🚀 Quick Start - Deploy AB AMS to Vercel

## ⚡ Fastest Way to Deploy

### 1. Create Database (5 minutes)
- Go to [Vercel Dashboard](https://vercel.com/dashboard) → Storage → Create Database → Postgres
- Copy `DATABASE_URL` and `DIRECT_URL`

### 2. Generate Secrets (1 minute)
```bash
# Run these commands:
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for NEXTAUTH_SECRET
```

### 3. Deploy (5 minutes)
```bash
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
vercel login
vercel
# Follow prompts, then:
vercel --prod
```

### 4. Add Environment Variables in Vercel Dashboard
Go to: Project → Settings → Environment Variables

Add these:
```
DATABASE_URL=<from step 1>
DIRECT_URL=<from step 1>
JWT_SECRET=<from step 2>
NEXTAUTH_SECRET=<from step 2>
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=AB AMS
LOCAL_DEV_MODE=false
```

### 5. Run Migrations & Seed (2 minutes)
```bash
# After deployment, run:
vercel env pull .env.local
npx prisma migrate deploy
npm run db:seed
```

### 6. Login! 🎉
- URL: `https://your-app.vercel.app/login`
- Email: `aleksacoach@gmail.com`
- Password: `Teodor2025`

---

## 📚 Full Documentation
See `DEPLOYMENT.md` for detailed instructions.

## ✅ Checklist
See `DEPLOYMENT_CHECKLIST.md` for step-by-step checklist.

---

**Total Time**: ~15 minutes
**Difficulty**: Easy ⭐⭐

