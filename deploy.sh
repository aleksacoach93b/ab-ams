#!/bin/bash

# AB - AMS Production Deployment Script
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
    echo "1. Push to GitHub"
    echo "2. Deploy on Vercel"
    echo "3. Setup Supabase database"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi
