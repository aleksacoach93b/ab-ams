# 🚀 Pokretanje Migracija na Produkciji

## Problem
Aplikacija je deployovana na Vercel-u, ali tabele ne postoje u produkcijskoj PostgreSQL bazi. Greška:
```
The table `public.Event` does not exist in the current database.
The table `public.Notification` does not exist in the current database.
```

## Rešenje

### 1. Pokreni migracije na produkciji

```bash
# Postavi DATABASE_URL na produkcijsku PostgreSQL bazu
export DATABASE_URL="postgresql://username:password@host:port/database"

# Pokreni migracije
npm run db:migrate

# Ili direktno
npx prisma migrate deploy
```

### 2. Alternativno - kroz Vercel CLI

```bash
# Instaliraj Vercel CLI
npm i -g vercel

# Login u Vercel
vercel login

# Pokreni migracije na produkciji
vercel env pull .env.production
DATABASE_URL=$(cat .env.production | grep DATABASE_URL | cut -d '=' -f2)
npx prisma migrate deploy
```

### 3. Kroz Vercel Dashboard

1. Idi na Vercel Dashboard
2. Otvori Environment Variables
3. Kopiraj DATABASE_URL
4. Pokreni lokalno:
```bash
DATABASE_URL="tvoj_produkcijski_url" npx prisma migrate deploy
```

## Provera

Nakon pokretanja migracija, testiraj:

```bash
curl https://ab-ams.vercel.app/api/events
curl https://ab-ams.vercel.app/api/notifications
```

Trebalo bi da vraćaju prazne nizove umesto "Internal server error".

## Migracije su kreirane

✅ `prisma/migrations/0_init/migration.sql` - Sadrži sve tabele
✅ `deploy-migrations.sh` - Script za pokretanje
✅ `package.json` - `db:migrate` script

## Sledeći koraci

1. Pokreni migracije na produkciji
2. Testiraj API endpoint-e
3. Kreiranje eventa će raditi! 🎉
