#!/bin/bash

# Deploy Script for Polymarket Copy Trading Bot
# Usage: ./deploy.sh [web|bot|all]

set -e

echo "🚀 Polymarket Copy Trading Bot Deployment"
echo "========================================="

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Copy .env.production to .env and fill in your values."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

case "$1" in
    web)
        echo "📦 Deploying Web Dashboard..."
        cd web
        
        # Build
        echo "Building..."
        npm run build
        
        # Deploy to Vercel (if vercel CLI is installed)
        if command -v vercel &> /dev/null; then
            echo "Deploying to Vercel..."
            vercel --prod
        else
            echo "Vercel CLI not found. Deploy manually or use Docker."
            echo "Run: docker build -f Dockerfile.web -t poly-copybot-web ."
        fi
        ;;
        
    bot)
        echo "🤖 Deploying Bot..."
        
        # Build
        echo "Building..."
        npm run build
        
        # Check if PM2 is installed
        if command -v pm2 &> /dev/null; then
            echo "Starting with PM2..."
            pm2 start ecosystem.config.js --env production
            pm2 save
            echo "Bot started! Check status with: pm2 status"
        else
            echo "PM2 not found. Starting with Docker..."
            docker-compose up -d bot
        fi
        ;;
        
    all)
        echo "📦 Deploying everything..."
        
        # Build bot
        echo "Building bot..."
        npm run build
        
        # Build web
        echo "Building web..."
        cd web && npm run build && cd ..
        
        # Start with Docker Compose
        echo "Starting services..."
        docker-compose up -d
        
        echo "✅ Deployment complete!"
        echo "   Web: http://localhost:3000"
        echo "   Bot: http://localhost:3001"
        ;;
        
    *)
        echo "Usage: ./deploy.sh [web|bot|all]"
        echo ""
        echo "Commands:"
        echo "  web  - Deploy web dashboard only"
        echo "  bot  - Deploy bot only"
        echo "  all  - Deploy everything with Docker Compose"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"