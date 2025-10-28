# 🚀 Ručno Pokretanje Migracija na Produkciji

## Problem
Vercel automatski deploy ne pokreće migracije. Tabele ne postoje u produkcijskoj bazi.

## Rešenje - Ručno Pokretanje

### 1. Dobij DATABASE_URL sa Vercel-a

**Opcija A: Kroz Vercel Dashboard**
1. Idi na https://vercel.com/dashboard
2. Otvori projekat "ab-ams"
3. Idi na Settings → Environment Variables
4. Kopiraj DATABASE_URL

**Opcija B: Kroz Vercel CLI**
```bash
# Instaliraj Vercel CLI
npm i -g vercel

# Login
vercel login

# Dobij environment varijable
vercel env pull .env.production
```

### 2. Pokreni Migracije

```bash
# Postavi DATABASE_URL
export DATABASE_URL="postgresql://username:password@host:port/database"

# Pokreni migracije
./run-migrations-manual.sh
```

**Ili direktno:**
```bash
DATABASE_URL="tvoj_postgresql_url" npx prisma migrate deploy
```

### 3. Proveri Rezultat

```bash
# Testiraj API endpoint-e
curl https://ab-ams.vercel.app/api/events
curl https://ab-ams.vercel.app/api/notifications
curl -X POST https://ab-ams.vercel.app/api/events/simple \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","date":"2025-01-25","type":"TRAINING"}'
```

## Očekivani Rezultati

**Pre migracija:**
```json
{"message":"Internal server error","error":"The table `public.Event` does not exist"}
```

**Posle migracija:**
```json
[]  // Prazan niz za GET /api/events
{"message":"Authentication required"}  // Za /api/notifications
{"message":"Event created successfully"}  // Za POST /api/events/simple
```

## Troubleshooting

### Greška: "DATABASE_URL nije postavljen"
```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```

### Greška: "DATABASE_URL nije PostgreSQL URL"
Proverite da li je URL u formatu:
```
postgresql://username:password@host:port/database
```

### Greška: "Connection refused"
- Proverite da li je baza dostupna
- Proverite da li su credentials ispravni
- Proverite da li je baza kreirana

## Script-ovi Kreirani

✅ `run-migrations-manual.sh` - Ručno pokretanje migracija
✅ `deploy-migrations.sh` - Deploy script
✅ `MIGRATION_INSTRUCTIONS.md` - Instrukcije

## Sledeći Koraci

1. Pokreni migracije ručno
2. Testiraj API endpoint-e
3. Kreiranje eventa će raditi! 🎉
