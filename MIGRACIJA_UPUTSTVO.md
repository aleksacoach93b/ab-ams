# 📋 Uputstvo za pokretanje migracija - Korak po korak

## ✅ Provera trenutnog stanja

Aplikacija je trenutno konfigurisana sa:
- ✅ Prisma schema definisan
- ✅ .env fajl postoji
- ❌ PostgreSQL server nije pokrenut
- ❌ Migracije nisu izvršene

---

## 🔧 KORAK 1: Pokreni PostgreSQL bazu

### Opcija A: Ako koristiš lokalni PostgreSQL (macOS)

```bash
# Proveri da li PostgreSQL radi
brew services list | grep postgresql

# Ako nije pokrenut, pokreni ga:
brew services start postgresql

# Ili ako koristiš PostgreSQL.app:
# Otvori PostgreSQL.app iz Applications foldera
```

### Opcija B: Ako koristiš Docker

```bash
# Pokreni PostgreSQL u Docker kontejneru
docker run --name postgres-ams \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=ams_db \
  -p 5432:5432 \
  -d postgres:15

# Proveri da li radi:
docker ps | grep postgres
```

### Opcija C: Ako koristiš cloud bazu (npr. Supabase, Neon, Railway)

1. Otvori svoj .env fajl
2. Proveri da li je `DATABASE_URL` ispravno postavljen
3. Baza već radi u cloud-u, preskoči ovaj korak

---

## 🔍 KORAK 2: Proveri DATABASE_URL u .env fajlu

```bash
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
cat .env | grep DATABASE_URL
```

**Format treba da bude:**
```
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

**Ako koristiš cloud bazu:**
```
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
```

---

## 🚀 KORAK 3: Pokreni Prisma migracije

```bash
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"

# 1. Generiši Prisma Client
npx prisma generate

# 2. Pokreni migracije
npx prisma migrate deploy

# ILI koristi npm script:
npm run db:migrate
```

**Očekivani rezultat:**
```
✅ Prisma Client generated
✅ Applied migration: 20241113200000_add_wellness_survey_models
```

**Ako dobiješ grešku:**
- `Can't reach database server` → PostgreSQL nije pokrenut (vrati se na KORAK 1)
- `Database does not exist` → Kreiraj bazu prvo:
  ```bash
  createdb ams_db  # ili tvoj naziv baze
  ```
- `Migration not found` → Kreiraj novu migraciju:
  ```bash
  npx prisma migrate dev --name add_wellness_survey_models
  ```

---

## 🔓 KORAK 4: Odkomentariši RecurringSurveyUpdater

1. Otvori fajl: `src/app/layout.tsx`
2. Pronađi linije:
   ```typescript
   // RecurringSurveyUpdater - temporarily disabled until database is ready
   // import RecurringSurveyUpdater from "@/components/RecurringSurveyUpdater";
   ```
3. Odkomentariši ih:
   ```typescript
   import RecurringSurveyUpdater from "@/components/RecurringSurveyUpdater";
   ```
4. Pronađi u JSX delu:
   ```typescript
   {/* RecurringSurveyUpdater - temporarily disabled until database migrations are run */}
   {/* <RecurringSurveyUpdater /> */}
   ```
5. Odkomentariši:
   ```typescript
   <RecurringSurveyUpdater />
   ```

---

## ✅ KORAK 5: Proveri da li sve radi

```bash
# Restartuj server
# (Zaustavi trenutni sa Ctrl+C, pa pokreni ponovo)
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
npm run dev
```

**Očekivani rezultat:**
- ✅ Server se pokreće bez grešaka
- ✅ Nema "Can't reach database" grešaka u konzoli
- ✅ Dashboard se učitava normalno
- ✅ Wellness Survey stranica radi

---

## 🆘 Rešavanje problema

### Problem: "Can't reach database server"
**Rešenje:** 
1. Proveri da li PostgreSQL radi: `brew services list` ili `docker ps`
2. Proveri port: `lsof -i :5432`
3. Proveri DATABASE_URL u .env

### Problem: "Migration not found"
**Rešenje:**
```bash
# Kreiraj novu migraciju
npx prisma migrate dev --name add_wellness_survey_models

# Ili primeni postojeće migracije
npx prisma migrate deploy
```

### Problem: "Database does not exist"
**Rešenje:**
```bash
# Kreiraj bazu (ako imaš psql)
createdb ams_db

# ILI kroz Prisma
npx prisma db push
```

---

## 📝 Napomene

- **Prisma migrate deploy** - primenjuje postojeće migracije (produkcija)
- **Prisma migrate dev** - kreira novu migraciju (razvoj)
- **Prisma db push** - sinhronizuje schema bez migracija (brzo, ali ne za produkciju)

---

## 🎯 Brzi start (ako već imaš bazu pokrenutu)

```bash
cd "/Users/aleksaboskovic/Desktop/NEW AB AMS APP"
npx prisma generate
npx prisma migrate deploy
# Zatim odkomentariši RecurringSurveyUpdater u layout.tsx
npm run dev
```

---

**Ako imaš problema, proveri:**
1. Da li PostgreSQL radi
2. Da li je DATABASE_URL ispravan u .env
3. Da li imaš dozvole za kreiranje baze
4. Da li su migracije u `prisma/migrations` folderu

