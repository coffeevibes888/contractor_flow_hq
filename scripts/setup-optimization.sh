#!/bin/bash

# CPU Optimization Setup Script
# Run this after setting up Upstash Redis

echo "🚀 Setting up CPU optimizations..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found. Creating from .env.example..."
  cp .env.example .env.local
  echo "⚠️  Please update .env.local with your Upstash Redis credentials"
  exit 1
fi

# Check for required env vars
if ! grep -q "UPSTASH_REDIS_REST_URL" .env.local; then
  echo "❌ UPSTASH_REDIS_REST_URL not found in .env.local"
  echo "Please add your Upstash Redis credentials:"
  echo "  1. Sign up at https://upstash.com"
  echo "  2. Create a Redis database"
  echo "  3. Copy REST URL and TOKEN to .env.local"
  exit 1
fi

# Install dependencies
echo "📦 Installing @upstash/redis..."
npm install @upstash/redis

# Generate cron secret if not exists
if ! grep -q "CRON_SECRET" .env.local; then
  echo "🔐 Generating CRON_SECRET..."
  CRON_SECRET=$(openssl rand -base64 32)
  echo "CRON_SECRET=\"$CRON_SECRET\"" >> .env.local
  echo "✅ CRON_SECRET added to .env.local"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy to Vercel: vercel --prod"
echo "  2. Add environment variables in Vercel dashboard:"
echo "     - UPSTASH_REDIS_REST_URL"
echo "     - UPSTASH_REDIS_REST_TOKEN"
echo "     - CRON_SECRET"
echo "  3. Verify cron job is running: Vercel Dashboard > Cron Jobs"
echo ""
echo "📖 Read the full guide: docs/CPU-OPTIMIZATION-GUIDE.md"
