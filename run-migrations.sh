#!/bin/bash

# Script za pokretanje migracija sa DATABASE_URL sa Vercel-a
# Kopiraj DATABASE_URL sa Vercel Dashboard-a i pokreni ovaj script

echo "🚀 Pokretanje migracija za AB-AMS aplikaciju..."

# Proveri da li je DATABASE_URL postavljen
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL nije postavljen!"
    echo ""
    echo "📋 Instrukcije:"
    echo "1. Idi na Vercel Dashboard → Settings → Environment Variables"
    echo "2. Kopiraj DATABASE_URL (postgresql://postgres.ylhmwuejz...)"
    echo "3. Pokreni:"
    echo "   export DATABASE_URL='tvoj_postgresql_url'"
    echo "   ./run-migrations.sh"
    echo ""
    echo "Ili direktno:"
    echo "DATABASE_URL='tvoj_postgresql_url' ./run-migrations.sh"
    exit 1
fi

echo "✅ DATABASE_URL je postavljen"
echo "🔗 Baza: $(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1)"

# Pokreni migracije
echo "📦 Pokretanje Prisma migracija..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migracije su uspešno pokrenute!"
    echo "🎉 Baza podataka je spremna za produkciju!"
    
    # Generiši Prisma client
    echo "🔧 Generisanje Prisma client-a..."
    npx prisma generate
    
    if [ $? -eq 0 ]; then
        echo "✅ Prisma client je uspešno generisan!"
    fi
    
    echo ""
    echo "🎯 Sve je spremno! Testiraj API endpoint-e:"
    echo "curl https://ab-ams.vercel.app/api/events"
    echo "curl https://ab-ams.vercel.app/api/notifications"
    echo ""
    echo "Testiraj kreiranje eventa:"
    echo "curl -X POST https://ab-ams.vercel.app/api/events/simple \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"title\":\"Test Event\",\"date\":\"2025-01-25\",\"type\":\"TRAINING\"}'"
    
else
    echo "❌ Greška pri pokretanju migracija!"
    echo "Proverite DATABASE_URL i pokušajte ponovo"
    exit 1
fi
