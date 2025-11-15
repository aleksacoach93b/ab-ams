#!/bin/bash

# Set database URLs
export DATABASE_URL="postgresql://postgres.kvhmwohqznwfbsmpqqup:Teodor06052025@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"
export DIRECT_URL="postgresql://postgres.kvhmwohqznwfbsmpqqup:Teodor06052025@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npm run db:seed

echo "✅ Done!"
