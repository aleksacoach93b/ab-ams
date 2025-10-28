#!/bin/bash

# AB - AMS Production Deployment Script
# This script prepares the application for deployment

echo "🚀 AB - AMS Production Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Found package.json"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Application is ready for deployment!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Push to GitHub:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Production ready'"
    echo "   git remote add origin https://github.com/yourusername/ab-ams.git"
    echo "   git push -u origin main"
    echo ""
    echo "2. Deploy on Vercel:"
    echo "   - Connect your GitHub repository"
    echo "   - Configure environment variables"
    echo "   - Deploy"
    echo ""
    echo "3. Database setup:"
    echo "   - Create Supabase project"
    echo "   - Run: npx prisma db push"
    echo "   - Run: npm run db:seed"
    echo ""
    echo "🔐 Environment variables needed:"
    echo "   - DATABASE_URL (Supabase PostgreSQL)"
    echo "   - JWT_SECRET"
    echo "   - NEXTAUTH_SECRET"
    echo "   - NEXTAUTH_URL"
    echo "   - BLOB_READ_WRITE_TOKEN (Vercel Blob)"
    echo "   - NEXT_PUBLIC_APP_URL"
    echo "   - NEXT_PUBLIC_APP_NAME"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi
