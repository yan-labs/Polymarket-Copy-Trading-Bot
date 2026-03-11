# 🚀 PolyCopy Quick Start

**3 Steps to Launch Your Polymarket Copy Trading SaaS**

---

## Step 1: MongoDB Atlas (5 min) ⚡

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) → Sign up (free)
2. Create a **free M0 cluster** (no credit card needed)
3. Create a database user:
   - Username: `polyadmin`
   - Password: (generate secure password)
   - Role: `Read and write to any database`
4. Network Access → Add IP → `0.0.0.0/0` (allow all)
5. Click "Connect" → "Connect your application"
6. Copy the connection string:
   ```
   mongodb+srv://polyadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your actual password

**Save this URI** - you'll need it for Step 3.

---

## Step 2: Stripe Products (10 min) 💳

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create 3 products:

| Product | Monthly | Yearly |
|---------|---------|--------|
| Basic | $29 | $290 |
| Pro | $59 | $590 |
| Enterprise | $99 | $990 |

3. For each product:
   - Click "Create product"
   - Name: `Basic` / `Pro` / `Enterprise`
   - Add monthly price: `$29` / `$59` / `$99`
   - Add yearly price: `$290` / `$590` / `$990`
   - Copy the **Price IDs** (look like `price_xxxxx`)

4. Create webhook:
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy the **Webhook Secret** (looks like `whsec_xxxxx`)

5. Copy your **Secret Key** from Developers → API Keys

**Save these keys** - you'll need them for Step 3.

---

## Step 3: Deploy to Vercel (5 min) 🚀

1. Click the **Deploy to Vercel** button in README
2. Sign in to Vercel (or create account)
3. Add these environment variables:

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=(run: openssl rand -base64 32)
MONGODB_URI=mongodb+srv://polyadmin:password@cluster0.xxxxx.mongodb.net/poly-copybot?retryWrites=true&w=majority
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxx
```

4. Click **Deploy**
5. Wait for deployment (2-3 min)
6. Visit your app! 🎉

---

## Step 4: Deploy Bot (Optional - For Production)

The web app works without the bot (users can register, view pricing, etc).

When you're ready for the bot:

```bash
# On a VPS (DigitalOcean, Railway, Fly.io)
git clone https://github.com/yan-labs/Polymarket-Copy-Trading-Bot.git
cd Polymarket-Copy-Trading-Bot
cp .env.production .env

# Edit .env with your values
nano .env

# Run with Docker
docker-compose up -d bot
```

---

## 🎉 You're Live!

- Users can sign up for 7-day free trial
- Stripe handles payments automatically
- Bot copies trades 24/7

---

## Need Help?

- Check `LAUNCH_CHECKLIST.md` for detailed steps
- Check `PROGRESS.md` for project status
- Issues? Check Vercel logs or Stripe dashboard