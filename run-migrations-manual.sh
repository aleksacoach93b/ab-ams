#!/bin/bash

# Script za ručno pokretanje migracija na produkciji
# Koristi DATABASE_URL koji je postavljen na Vercel-u

echo "🚀 Ručno pokretanje migracija na produkciji..."

# Proveri da li je DATABASE_URL postavljen
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL nije postavljen!"
    echo "Molimo postavite DATABASE_URL environment varijablu sa produkcijskim PostgreSQL URL-om"
    echo ""
    echo "Primer:"
    echo "export DATABASE_URL='postgresql://username:password@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL je postavljen"

# Proveri da li je DATABASE_URL PostgreSQL
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "❌ DATABASE_URL nije PostgreSQL URL!"
    echo "Trenutni DATABASE_URL: $DATABASE_URL"
    echo "Očekivani format: postgresql://username:password@host:port/database"
    exit 1
fi

echo "✅ DATABASE_URL je PostgreSQL URL"

# Pokreni migracije
echo "📦 Pokretanje Prisma migracija..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migracije su uspešno pokrenute!"
    echo "🎉 Baza podataka je spremna za produkciju!"
    
    # Testiraj konekciju
    echo "🔍 Testiranje konekcije..."
    npx prisma db execute --stdin <<< "SELECT 1 as test;"
    
    if [ $? -eq 0 ]; then
        echo "✅ Konekcija sa bazom je uspešna!"
    else
        echo "⚠️  Konekcija sa bazom nije uspešna, ali migracije su pokrenute"
    fi
else
    echo "❌ Greška pri pokretanju migracija!"
    echo "Proverite DATABASE_URL i pokušajte ponovo"
    exit 1
fi

# Generiši Prisma client
echo "🔧 Generisanje Prisma client-a..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client je uspešno generisan!"
else
    echo "❌ Greška pri generisanju Prisma client-a!"
    exit 1
fi

echo ""
echo "🎯 Sve je spremno! Aplikacija može da radi na produkciji."
echo "Testirajte API endpoint-e:"
echo "curl https://ab-ams.vercel.app/api/events"
echo "curl https://ab-ams.vercel.app/api/notifications"
