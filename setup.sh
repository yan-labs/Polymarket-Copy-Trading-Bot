#!/bin/bash
# Poly-CopyBot Quick Setup Script
# This script helps you set up Stripe products and deploy to production

set -e

echo "🚀 Poly-CopyBot Setup Script"
echo "=============================="
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        echo "   $2"
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node "Visit https://nodejs.org"
check_command npm "Visit https://nodejs.org"
check_command vercel "Run: npm i -g vercel"
echo "✅ All prerequisites met!"
echo ""

# Prompt for Stripe key
echo "💳 Stripe Setup"
echo "---------------"
echo "To create products automatically, you need a Stripe Secret Key."
echo "Get it from: https://dashboard.stripe.com/test/apikeys"
echo ""
read -p "Enter your Stripe Secret Key (sk_test_...): " STRIPE_KEY

if [[ -z "$STRIPE_KEY" ]]; then
    echo "⚠️  No Stripe key provided. You'll need to create products manually."
    echo "   See LAUNCH_CHECKLIST.md for instructions."
    MANUAL_STRIPE=true
else
    echo ""
    echo "🔄 Creating Stripe products and prices..."
    
    # Create products and prices via Stripe API
    create_price() {
        local name=$1
        local amount=$2
        local interval=$3
        local product_id=$4
        
        curl -s https://api.stripe.com/v1/prices \
            -u "$STRIPE_KEY:" \
            -d "product=$product_id" \
            -d "unit_amount=$amount" \
            -d "currency=usd" \
            -d "recurring[interval]=$interval" \
            | jq -r '.id'
    }
    
    # Create Basic product
    BASIC_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
        -u "$STRIPE_KEY:" \
        -d "name=Basic" \
        -d "description=Copy up to 5 traders with advanced strategies" \
        | jq -r '.id')
    
    BASIC_MONTHLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$BASIC_PRODUCT" \
        -d "unit_amount=2900" \
        -d "currency=usd" \
        -d "recurring[interval]=month" \
        | jq -r '.id')
    
    BASIC_YEARLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$BASIC_PRODUCT" \
        -d "unit_amount=29000" \
        -d "currency=usd" \
        -d "recurring[interval]=year" \
        | jq -r '.id')
    
    # Create Pro product
    PRO_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
        -u "$STRIPE_KEY:" \
        -d "name=Pro" \
        -d "description=Copy up to 20 traders with analytics and API access" \
        | jq -r '.id')
    
    PRO_MONTHLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$PRO_PRODUCT" \
        -d "unit_amount=5900" \
        -d "currency=usd" \
        -d "recurring[interval]=month" \
        | jq -r '.id')
    
    PRO_YEARLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$PRO_PRODUCT" \
        -d "unit_amount=59000" \
        -d "currency=usd" \
        -d "recurring[interval]=year" \
        | jq -r '.id')
    
    # Create Enterprise product
    ENT_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
        -u "$STRIPE_KEY:" \
        -d "name=Enterprise" \
        -d "description=Copy up to 100 traders with dedicated support" \
        | jq -r '.id')
    
    ENT_MONTHLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$ENT_PRODUCT" \
        -d "unit_amount=9900" \
        -d "currency=usd" \
        -d "recurring[interval]=month" \
        | jq -r '.id')
    
    ENT_YEARLY=$(curl -s https://api.stripe.com/v1/prices \
        -u "$STRIPE_KEY:" \
        -d "product=$ENT_PRODUCT" \
        -d "unit_amount=99000" \
        -d "currency=usd" \
        -d "recurring[interval]=year" \
        | jq -r '.id')
    
    echo ""
    echo "✅ Stripe products created!"
    echo ""
    echo "📋 Price IDs:"
    echo "   Basic Monthly: $BASIC_MONTHLY"
    echo "   Basic Yearly: $BASIC_YEARLY"
    echo "   Pro Monthly: $PRO_MONTHLY"
    echo "   Pro Yearly: $PRO_YEARLY"
    echo "   Enterprise Monthly: $ENT_MONTHLY"
    echo "   Enterprise Yearly: $ENT_YEARLY"
    echo ""
    
    # Update stripe.ts with actual price IDs (only update the STRIPE_PRICES object)
    sed -i '' "s/price_basic_monthly/$BASIC_MONTHLY/g" web/lib/stripe.ts
    sed -i '' "s/price_basic_yearly/$BASIC_YEARLY/g" web/lib/stripe.ts
    sed -i '' "s/price_pro_monthly/$PRO_MONTHLY/g" web/lib/stripe.ts
    sed -i '' "s/price_pro_yearly/$PRO_YEARLY/g" web/lib/stripe.ts
    sed -i '' "s/price_enterprise_monthly/$ENT_MONTHLY/g" web/lib/stripe.ts
    sed -i '' "s/price_enterprise_yearly/$ENT_YEARLY/g" web/lib/stripe.ts
    
    echo "✅ Updated web/lib/stripe.ts with actual price IDs!"
fi

echo ""
echo "🍃 MongoDB Setup"
echo "---------------"
echo "You need a MongoDB connection string."
echo "Get one free at: https://www.mongodb.com/atlas"
echo ""
read -p "Enter your MongoDB URI (mongodb+srv://...): " MONGO_URI

if [[ -z "$MONGO_URI" ]]; then
    echo "⚠️  No MongoDB URI provided. You'll need to set it manually."
fi

echo ""
echo "🌐 Vercel Deployment"
echo "--------------------"
read -p "Deploy to Vercel now? (y/n): " DEPLOY

if [[ "$DEPLOY" == "y" || "$DEPLOY" == "Y" ]]; then
    echo ""
    echo "🚀 Deploying to Vercel..."
    
    cd web
    
    # Set environment variables
    if [[ -n "$STRIPE_KEY" ]]; then
        vercel env add STRIPE_SECRET_KEY production <<< "$STRIPE_KEY"
    fi
    if [[ -n "$MONGO_URI" ]]; then
        vercel env add MONGODB_URI production <<< "$MONGO_URI"
    fi
    
    # Generate random secret for NextAuth
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"
    
    # Deploy
    vercel --prod
    
    echo ""
    echo "✅ Deployment complete!"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
if [[ "$MANUAL_STRIPE" == "true" ]]; then
    echo "1. Create Stripe products manually (see LAUNCH_CHECKLIST.md)"
fi
echo "2. Set up webhook in Stripe Dashboard"
echo "3. Configure domain in Vercel"
echo "4. Deploy the bot (see LAUNCH_CHECKLIST.md Phase 4)"
echo ""
echo "📚 Documentation: LAUNCH_CHECKLIST.md"