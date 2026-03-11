# Demo Mode Guide

**Quick Start**: Test the product without Stripe API keys!

## What is Demo Mode?

Demo mode allows you to test the full subscription flow without setting up Stripe. When enabled:
- Users can "subscribe" to any tier without payment
- All subscription features work normally
- Perfect for testing before production launch

## How to Enable Demo Mode

### 1. Create `.env.local` in the `web/` directory

```bash
cd web
cat > .env.local << 'EOF'
# Demo Mode
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

# Database (required)
MONGODB_URI=mongodb://localhost:27017/polymarket-copy-bot

# Auth (required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# Stripe (not needed in demo mode)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
EOF
```

### 2. Start MongoDB (if not running)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or using local MongoDB
mongod --dbpath /path/to/data
```

### 3. Start the Web App

```bash
cd web
npm install
npm run dev
```

### 4. Test the Product

1. Open http://localhost:3000
2. Click "Get Started" or "Register"
3. Create an account
4. Go to Pricing page
5. Click "Subscribe" on any tier
6. The subscription will be activated without payment!

## What Works in Demo Mode

- ✅ User registration and login
- ✅ Subscription to any tier (Basic, Pro, Enterprise)
- ✅ Subscription status display
- ✅ All dashboard features
- ✅ Trader management
- ✅ Settings

## What Doesn't Work in Demo Mode

- ❌ Real payments (obviously!)
- ❌ Stripe webhook events
- ❌ Subscription cancellation via Stripe portal
- ❌ Invoice generation

## Demo Mode Indicators

When demo mode is active, you'll see:
- Yellow "Demo Mode Active" banner on pricing page
- Yellow "Demo" badge in subscription info
- Demo mode banner in subscription details

## Switching to Production

When ready to launch with real payments:

1. Remove or set to `false`:
   ```
   DEMO_MODE=false
   NEXT_PUBLIC_DEMO_MODE=false
   ```

2. Add real Stripe keys:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Create Stripe products and update `STRIPE_PRICES` in `web/lib/stripe.ts`

## Troubleshooting

### "Demo mode is not enabled" error
Make sure `DEMO_MODE=true` is set in your `.env.local` file.

### MongoDB connection error
Ensure MongoDB is running and `MONGODB_URI` is correct.

### Subscription not activating
Check the browser console for errors. The demo checkout should return success.

---

**Need help?** Check the [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for full deployment instructions.