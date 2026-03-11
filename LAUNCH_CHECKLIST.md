# 🚀 Launch Checklist - Polymarket Copy Trading Bot

**Target Launch Date:** _______________

---

## Phase 1: Stripe Setup (30 min)

### Create Stripe Products

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/products

2. **Create 3 Products** with these exact names:

   **Basic Plan - $29/month**
   - Name: `Basic`
   - Description: `Copy up to 5 traders with advanced strategies`
   - Prices:
     - Monthly: $29/month → copy Price ID (price_xxx) to `.env`
     - Yearly: $290/year (17% discount) → copy to `.env`

   **Pro Plan - $59/month** (Most Popular)
   - Name: `Pro`
   - Description: `Copy up to 20 traders with analytics and API access`
   - Prices:
     - Monthly: $59/month → copy to `.env`
     - Yearly: $590/year → copy to `.env`

   **Enterprise Plan - $99/month**
   - Name: `Enterprise`
   - Description: `Copy up to 100 traders with dedicated support`
   - Prices:
     - Monthly: $99/month → copy to `.env`
     - Yearly: $990/year → copy to `.env`

3. **Update Price IDs** in `web/lib/stripe.ts`:
   ```typescript
   export const STRIPE_PRICES = {
     basic: { monthly: 'price_xxx', yearly: 'price_xxx' },
     pro: { monthly: 'price_xxx', yearly: 'price_xxx' },
     enterprise: { monthly: 'price_xxx', yearly: 'price_xxx' },
   };
   ```

4. **Create Webhook**:
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy Webhook Secret to `.env`

### Test Stripe Integration
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout flow
- [ ] Verify subscription appears in Stripe
- [ ] Test webhook delivery

---

## Phase 2: MongoDB Setup (15 min)

### Option A: MongoDB Atlas (Recommended)

1. **Create Account**: https://www.mongodb.com/atlas
2. **Create Free Cluster**:
   - Provider: AWS or GCP
   - Region: Closest to your users
   - Cluster Tier: M0 (Free)
3. **Create Database User**:
   - Username: `poly-copybot`
   - Password: Generate secure password
   - Role: Read and write to any database
4. **Network Access**:
   - Add IP: `0.0.0.0/0` (allow all) or specific server IPs
5. **Get Connection String**:
   - Click "Connect" → "Connect your application"
   - Copy connection string to `.env`

### Option B: Self-hosted MongoDB

Use `docker-compose up mongodb` for development.

---

## Phase 3: Web Deployment (20 min)

### Deploy to Vercel (Recommended)

1. **Push to GitHub**: Already done ✅
2. **Import to Vercel**:
   - Go to https://vercel.com/new
   - Select `yan-labs/Polymarket-Copy-Trading-Bot`
   - Root Directory: `web`
   - Framework Preset: Next.js
3. **Set Environment Variables** (all from `.env.production`):
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `MONGODB_URI`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - All `STRIPE_PRICE_*` variables
4. **Deploy**
5. **Configure Domain**:
   - Add custom domain in Vercel settings
   - Update `NEXTAUTH_URL` to match

### Alternative: Deploy to Render

```bash
# Create render.yaml in web/
services:
  - type: web
    name: poly-copybot-web
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

---

## Phase 4: Bot Deployment (30 min)

### Option A: DigitalOcean Droplet

1. **Create Droplet**:
   - Image: Ubuntu 22.04
   - Size: $12/month (2GB RAM)
   - Region: Closest to users

2. **Initial Setup**:
   ```bash
   ssh root@your-droplet-ip
   apt update && apt upgrade -y
   apt install -y nodejs npm docker.io docker-compose
   ```

3. **Clone and Run**:
   ```bash
   git clone https://github.com/yan-labs/Polymarket-Copy-Trading-Bot.git
   cd Polymarket-Copy-Trading-Bot
   cp .env.production .env
   # Edit .env with your values
   docker-compose up -d bot
   ```

4. **Set up PM2 (alternative to Docker)**:
   ```bash
   npm install -g pm2
   npm run build
   pm2 start dist/index-multiuser.js --name poly-copybot
   pm2 save
   pm2 startup
   ```

### Option B: Railway

```bash
railway login
railway init
railway up
```

### Option C: Fly.io

```bash
fly launch
fly deploy
```

---

## Phase 5: Domain & SSL (10 min)

1. **Point DNS** to Vercel/bot server
2. **SSL** is automatic on Vercel
3. **For bot server**, use Caddy:
   ```bash
   # Install Caddy
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   
   # Caddyfile
   api.yourdomain.com {
     reverse_proxy localhost:3001
   }
   ```

---

## Phase 6: Pre-Launch Testing (30 min)

### Test User Flow

1. **Registration**:
   - [ ] Register new account
   - [ ] Verify 7-day trial is active
   - [ ] Check welcome email (if configured)

2. **Dashboard**:
   - [ ] View trial status
   - [ ] Add Polymarket wallet address
   - [ ] Add trader to follow
   - [ ] Check settings save

3. **Subscription**:
   - [ ] View pricing page
   - [ ] Start checkout (test mode)
   - [ ] Complete payment
   - [ ] Verify subscription status updates
   - [ ] Test manage subscription portal

4. **Bot Integration**:
   - [ ] Bot shows as running in dashboard
   - [ ] Trade is detected when followed trader trades
   - [ ] Trade is copied to user's account

---

## Phase 7: Launch! 🎉

### Marketing Channels

1. **Polymarket Community**:
   - [ ] Post in Polymarket Discord
   - [ ] Share in relevant Twitter/X communities
   - [ ] Post on r/Polymarket subreddit

2. **Product Directories**:
   - [ ] Submit to Product Hunt
   - [ ] Post on Hacker News (Show HN)
   - [ ] List on AI product directories

3. **Content Marketing**:
   - [ ] Write blog post: "How I built a Polymarket copy trading bot"
   - [ ] Create demo video
   - [ ] Share on Twitter/X

### Support Setup

- [ ] Create support email: support@yourdomain.com
- [ ] Set up Discord server for users
- [ ] Create FAQ page

---

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor error logs (Sentry/console)
- [ ] Check Stripe for failed payments
- [ ] Watch user signups
- [ ] Respond to support requests

### First Week
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Track conversion rate (trial → paid)
- [ ] Monitor bot uptime

### First Month
- [ ] Analyze usage patterns
- [ ] Prioritize feature requests
- [ ] Consider pricing adjustments

---

## Emergency Contacts

- **Stripe Support**: https://support.stripe.com
- **MongoDB Atlas Support**: https://support.mongodb.com
- **Vercel Support**: https://vercel.com/support
- **DigitalOcean Support**: https://docs.digitalocean.com/support/

---

## Notes

- Keep `.env` file secure and never commit it
- Set up monitoring/alerting before launch
- Have rollback plan ready
- Document all configuration for future reference

**Good luck! 🚀**