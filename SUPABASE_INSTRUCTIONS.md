# 📋 Supabase Connection String - Tačne Instrukcije

## ✅ Korak 1: Transaction Pooler (ZA PRODUCTION)

1. **Ostavi "Transaction pooler" izabran** (kao što je sada)
2. **Klikni na "Shared Pooler" button** ispod opcije
3. **Kopiraj connection string** koji se pojavi
4. **Zameni `[YOUR-PASSWORD]` sa:** `Teodor06052025`

**Ovo je za DATABASE_URL** (glavni connection)

Primer kako bi trebalo da izgleda:
```
postgresql://postgres.xxxxx:Teodor06052025@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## ✅ Korak 2: Direct Connection (ZA MIGRACIJE)

1. **Izaberi "Direct connection"** iz dropdown-a
2. **Kopiraj connection string**
3. **Zameni `[YOUR-PASSWORD]` sa:** `Teodor06052025`

**Ovo je za DIRECT_URL** (za Prisma migracije)

Primer kako bi trebalo da izgleda:
```
postgresql://postgres.xxxxx:Teodor06052025@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**ILI** ako vidiš connection string bez pooler-a:
```
postgresql://postgres.xxxxx:Teodor06052025@db.xxxxx.supabase.co:5432/postgres
```

---

## 📝 ŠTA MI TREBA:

**Pošalji mi OBA linka:**

1. **DATABASE_URL** (Transaction pooler - port 6543):
   ```
   postgresql://postgres.xxxxx:Teodor06052025@...
   ```

2. **DIRECT_URL** (Direct connection - port 5432):
   ```
   postgresql://postgres.xxxxx:Teodor06052025@...
   ```

---

## ⚠️ VAŽNO:

- **DATABASE_URL** = Transaction pooler (za aplikaciju)
- **DIRECT_URL** = Direct connection (za migracije)
- **Šifra je:** `Teodor06052025` (zameni `[YOUR-PASSWORD]` sa ovom šifrom)

---

## 🔍 Gde da nađeš:

1. Supabase Dashboard → Tvoj projekat
2. Project Settings → Database
3. Scroll down do "Connection string"
4. Izaberi "URI" tab
5. Menjaj između "Transaction pooler" i "Direct connection"
6. Kopiraj oba i zameni šifru

---

**Kada mi pošalješ OBA linka sa zamenjenom šifrom, nastavljam sa deployment-om! 🚀**

