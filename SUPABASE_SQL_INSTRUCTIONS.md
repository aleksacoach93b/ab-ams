# 📋 Supabase SQL Setup - Instrukcije

## ✅ Kako da pokreneš SQL u Supabase:

### Korak 1: Otvori Supabase SQL Editor
1. Idi na https://supabase.com
2. Login u tvoj projekat
3. U levoj navigaciji klikni na **"SQL Editor"**
4. Klikni na **"New query"**

### Korak 2: Kopiraj i pokreni SQL
1. Otvori fajl `SUPABASE_SETUP.sql` u ovom folderu
2. **Kopiraj SAV sadržaj** fajla
3. **Nalepi u Supabase SQL Editor**
4. Klikni na **"Run"** (ili pritisni `Ctrl+Enter` / `Cmd+Enter`)

### Korak 3: Proveri rezultat
- Trebalo bi da vidiš: **"Success. No rows returned"** ili sličnu poruku
- Ako vidiš greške, proveri da li su tabele već kreirane

---

## ⚠️ VAŽNO:

- **Pokreni SQL samo JEDNOM** - ako pokreneš više puta, može da dođe do grešaka
- **Ako vidiš grešku "already exists"** - to je OK, znači da su neke tabele već kreirane
- **Nakon pokretanja SQL-a**, javi mi da pokrenem seed script za admin user-a

---

## 📝 Šta SQL radi:

1. ✅ Kreira sve ENUM tipove (UserRole, PlayerStatus, itd.)
2. ✅ Kreira sve tabele (users, players, events, chat, itd.)
3. ✅ Kreira sve foreign key veze
4. ✅ Kreira sve indexe

---

## 🔄 Nakon SQL-a:

Kada pokreneš SQL i vidiš da je uspešno, javi mi pa ću:
1. ✅ Pokrenuti seed script (kreira admin user-a)
2. ✅ Testirati da sve radi

---

**Fajl za kopiranje**: `SUPABASE_SETUP.sql`

