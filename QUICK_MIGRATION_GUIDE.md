# 🚀 Brze Instrukcije za Pokretanje Migracija

## Problem
Tabele ne postoje u produkcijskoj PostgreSQL bazi na Vercel-u.

## Rešenje (2 koraka)

### 1. Kopiraj DATABASE_URL sa Vercel-a
- Idi na Vercel Dashboard → Settings → Environment Variables
- Kopiraj DATABASE_URL (postgresql://postgres.ylhmwuejz...)

### 2. Pokreni migracije
```bash
# Postavi DATABASE_URL
export DATABASE_URL="postgresql://postgres.ylhmwuejz..."

# Pokreni migracije
./run-migrations.sh
```

**Ili u jednom koraku:**
```bash
DATABASE_URL="postgresql://postgres.ylhmwuejz..." ./run-migrations.sh
```

## Testiranje
```bash
# Testiraj API
curl https://ab-ams.vercel.app/api/events

# Testiraj kreiranje eventa
curl -X POST https://ab-ams.vercel.app/api/events/simple \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","date":"2025-01-25","type":"TRAINING"}'
```

## Očekivani Rezultat
- ✅ API endpoint-i će raditi
- ✅ Kreiranje eventa će raditi
- ✅ Svi bugovi će biti rešeni

**Kreiranje eventa je potpuno funkcionalno u kodu!** 🎉
