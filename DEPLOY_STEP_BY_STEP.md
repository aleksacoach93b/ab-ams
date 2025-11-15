# 🚀 Step-by-Step Deployment Guide

## 📋 Šta MOGU da uradim automatski (AI Assistant):
- ✅ Instalirati Vercel CLI
- ✅ Pokrenuti deployment komande
- ✅ Podesiti environment variables (ako mi daš podatke)
- ✅ Pokrenuti database migracije
- ✅ Pokrenuti seed script
- ✅ Proveriti build i deployment status

## 🔐 Šta MORAS ti da uradiš manuelno:
- ⚠️ Kreirati Vercel nalog (ako nemaš)
- ⚠️ Kreirati Supabase projekat (ako nemaš)
- ⚠️ Dobiti DATABASE_URL i DIRECT_URL iz Supabase
- ⚠️ Login na Vercel (prvi put)

---

## 📝 PODACI KOJE MI TREBAJU:

### 1. Supabase Credentials:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

**Gde da nađeš:**
- Supabase Dashboard → Project Settings → Database
- Connection string (URI format)

### 2. Vercel Account:
- Email adresa za Vercel nalog
- (Ako nemaš nalog, moraš prvo da ga kreiraš)

### 3. Generated Secrets (mogu da generišem):
- JWT_SECRET (generišem)
- NEXTAUTH_SECRET (generišem)

---

## 🎯 KORAK PO KORAK:

### KORAK 1: Kreiraj Supabase Projekat (TI)

1. Idi na https://supabase.com
2. Login ili Sign Up
3. Klikni "New Project"
4. Unesi:
   - Project Name: `ab-ams-app` (ili bilo koji naziv)
   - Database Password: **ZAPAMTI OVU ŠIFRU!**
   - Region: Izaberi najbližu (npr. Europe West)
5. Klikni "Create new project"
6. Sačekaj da se projekat kreira (~2 minuta)

**Kada se projekat kreira:**
1. Idi na Project Settings → Database
2. Scroll down do "Connection string"
3. Izaberi "URI" tab
4. Kopiraj connection string
5. Zameni `[YOUR-PASSWORD]` sa tvojom šifrom
6. **POŠALJI MI OVAJ URL!**

Primer:
```
postgresql://postgres.xxxxx:Teodor2025@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

### KORAK 2: Kreiraj Vercel Nalog (TI - ako nemaš)

1. Idi na https://vercel.com
2. Klikni "Sign Up"
3. Izaberi GitHub, GitLab ili Email
4. Završi registraciju

**POŠALJI MI:**
- Email adresu koju si koristio za Vercel

---

### KORAK 3: Instalacija i Deployment (JA - automatski)

Kada mi pošalješ podatke, ja ću:
1. Instalirati Vercel CLI
2. Login na Vercel
3. Deploy aplikaciju
4. Podesiti sve environment variables
5. Pokrenuti migracije
6. Pokrenuti seed script

---

## 📧 ŠTA MI TREBA OD TEBE:

**Pošalji mi sledeće podatke:**

1. **Supabase DATABASE_URL:**
   ```
   postgresql://postgres.xxxxx:[PASSWORD]@[HOST]:5432/postgres
   ```

2. **Supabase DIRECT_URL:**
   ```
   (obično isti kao DATABASE_URL, ali sa :6543 portom za pooler)
   ```

3. **Vercel Email:**
   ```
   tvoja@email.com
   ```

4. **Želiš li custom domain?** (opciono)
   ```
   da/ne
   ```

---

## ⚡ BRZI START (Kada mi pošalješ podatke):

```bash
# 1. Instaliraj Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
vercel
vercel --prod

# 4. Set environment variables (ja ću ovo uraditi)
# 5. Run migrations
npx prisma migrate deploy

# 6. Seed database
npm run db:seed
```

---

## ✅ CHECKLIST PRE NEGO ŠTO POŠALJEŠ PODATKE:

- [ ] Supabase projekat kreiran
- [ ] DATABASE_URL kopiran (sa tvojom šifrom)
- [ ] DIRECT_URL kopiran
- [ ] Vercel nalog kreiran
- [ ] Vercel email spreman

---

## 🆘 POMOĆ:

Ako imaš problema:
1. **Supabase:** Proveri da li je projekat aktivan
2. **Vercel:** Proveri da li si login-ovan
3. **Database URL:** Proveri da li imaš pravu šifru

---

**Kada mi pošalješ podatke, ja ću odraditi sve automatski! 🚀**

