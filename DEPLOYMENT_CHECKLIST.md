# ✅ Deployment Checklist

Use this checklist to ensure everything is ready for deployment.

## Pre-Deployment

- [ ] **Code is ready**
  - [ ] All features tested locally
  - [ ] No console errors
  - [ ] All dependencies in package.json
  - [ ] No hardcoded credentials

- [ ] **Database ready**
  - [ ] PostgreSQL database created
  - [ ] DATABASE_URL obtained
  - [ ] DIRECT_URL obtained
  - [ ] Database is accessible

- [ ] **Environment variables prepared**
  - [ ] JWT_SECRET generated (32+ chars)
  - [ ] NEXTAUTH_SECRET generated (32+ chars)
  - [ ] All URLs prepared
  - [ ] Optional services configured (email, storage)

## Deployment Steps

- [ ] **Vercel setup**
  - [ ] Vercel account created
  - [ ] Vercel CLI installed (or GitHub connected)
  - [ ] Project initialized

- [ ] **Environment variables added**
  - [ ] DATABASE_URL
  - [ ] DIRECT_URL
  - [ ] JWT_SECRET
  - [ ] NEXTAUTH_SECRET
  - [ ] NEXTAUTH_URL
  - [ ] NEXT_PUBLIC_APP_URL
  - [ ] NEXT_PUBLIC_APP_NAME
  - [ ] LOCAL_DEV_MODE=false
  - [ ] Optional: RESEND_API_KEY
  - [ ] Optional: BLOB_READ_WRITE_TOKEN

- [ ] **Deployment**
  - [ ] Code pushed/deployed
  - [ ] Build successful
  - [ ] No build errors

- [ ] **Database setup**
  - [ ] Migrations run successfully
  - [ ] Database seeded (admin user created)
  - [ ] Tables created correctly

## Post-Deployment

- [ ] **Application works**
  - [ ] Homepage loads
  - [ ] Login page accessible
  - [ ] Can login with admin credentials
  - [ ] Dashboard loads
  - [ ] No console errors

- [ ] **Features tested**
  - [ ] User management works
  - [ ] Player creation works
  - [ ] Event creation works
  - [ ] Chat works
  - [ ] Notifications work
  - [ ] File uploads work
  - [ ] Reports work

- [ ] **Security**
  - [ ] HTTPS enabled
  - [ ] Admin password changed
  - [ ] Environment variables secure
  - [ ] No sensitive data in logs

- [ ] **Monitoring**
  - [ ] Logs accessible
  - [ ] Error tracking set up
  - [ ] Performance monitoring enabled

## Final Steps

- [ ] **Documentation**
  - [ ] Deployment URL saved
  - [ ] Admin credentials saved securely
  - [ ] Team members notified

- [ ] **Backup**
  - [ ] Database backup configured
  - [ ] Code repository backed up

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Deployment Date**: _______________

**Deployment URL**: _______________

**Admin Email**: aleksacoach@gmail.com

**Admin Password**: Teodor2025 (⚠️ CHANGE AFTER FIRST LOGIN)

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel --prod

# Run migrations
npx prisma migrate deploy

# Seed database
npm run db:seed

# View logs
vercel logs

# Check environment variables
vercel env ls
```

