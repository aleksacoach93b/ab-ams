#!/bin/bash

# Script za pokretanje migracija na produkciji
# Koristi DATABASE_URL koji je postavljen na Vercel-u

echo "🚀 Pokretanje migracija na produkciji..."

# Proveri da li je DATABASE_URL postavljen
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL nije postavljen!"
    echo "Molimo postavite DATABASE_URL environment varijablu sa produkcijskim PostgreSQL URL-om"
    exit 1
fi

echo "✅ DATABASE_URL je postavljen"

# Pokreni migracije
echo "📦 Pokretanje Prisma migracija..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migracije su uspešno pokrenute!"
    echo "🎉 Baza podataka je spremna za produkciju!"
else
    echo "❌ Greška pri pokretanju migracija!"
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

echo "🎯 Sve je spremno! Aplikacija može da radi na produkciji."
