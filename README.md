# PolyCopy - Polymarket Copy Trading SaaS

> **Automated copy trading platform for Polymarket.** Follow top traders, copy their bets automatically, and profit while you sleep.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyan-labs%2FPolymarket-Copy-Trading-Bot&root-directory=web)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)

---

## 🚀 What is PolyCopy?

PolyCopy is a **SaaS platform** that lets anyone automatically copy trades from successful Polymarket traders. No coding required. Just connect your wallet, pick traders to follow, and let the bot do the rest.

### Why PolyCopy?

- **💰 Profit from Expert Traders** - Copy winning strategies from top performers
- **⏰ Save Time** - No need to watch markets 24/7
- **🎯 Reduce Risk** - Diversify by following multiple traders
- **📊 Track Everything** - Full analytics and trade history

---

## ✨ Features

### For Users
- **One-Click Setup** - Connect wallet, pick traders, start copying
- **Real-Time Execution** - Trades copied within seconds
- **Smart Position Sizing** - Automatically scales to your balance
- **Multi-Trader Support** - Follow up to 100 traders (by plan)
- **Risk Controls** - Set max position sizes and stop losses
- **7-Day Free Trial** - Try Pro features before paying

### For Operators
- **Multi-Tenant Architecture** - Serve unlimited users
- **Stripe Billing** - Subscription management built-in
- **MongoDB Backend** - Scalable data storage
- **Docker Ready** - One-command deployment
- **Admin Dashboard** - Monitor all users and trades

---

## 💰 Pricing

| Plan | Price | Traders | Features |
|------|-------|---------|----------|
| **Free** | $0 | 1 | Basic copy trading, community support |
| **Basic** | $29/mo | 5 | Advanced strategies, priority support |
| **Pro** | $59/mo | 20 | Analytics, API access, Telegram alerts |
| **Enterprise** | $99/mo | 100 | Dedicated support, white-label option |

**All plans include 7-day free trial of Pro features.**

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│    MongoDB      │◀────│   Bot Engine    │
│   (Dashboard)   │     │   (Database)    │     │  (TypeScript)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│     Stripe      │                           │   Polymarket    │
│   (Payments)    │                           │   CLOB API      │
└─────────────────┘                           └─────────────────┘
```

### Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS, Radix UI
- **Backend**: TypeScript, Node.js
- **Database**: MongoDB (Atlas or self-hosted)
- **Payments**: Stripe (subscriptions + billing portal)
- **Auth**: NextAuth.js (email/password)
- **Deployment**: Docker, PM2, Vercel

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Atlas free tier works)
- Stripe account (for payments)
- Polygon wallet with USDC

### 1. Clone & Install

```bash
git clone https://github.com/yan-labs/Polymarket-Copy-Trading-Bot.git
cd Polymarket-Copy-Trading-Bot
npm install
cd web && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

Edit `.env` and `web/.env.local` with your values:

```bash
# Required for Web
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<random-32-char-string>
MONGODB_URI=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required for Bot
MONGO_URI=mongodb+srv://...
RPC_URL=https://polygon-mainnet.infura.io/v3/...
```

### 3. Create Stripe Products

**Option A: Automatic (Recommended)**
```bash
./setup.sh
```

**Option B: Manual**
See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for step-by-step instructions.

### 4. Deploy

**Web (Vercel)**
```bash
cd web
vercel --prod
```

**Bot (VPS/Docker)**
```bash
docker-compose up -d bot
```

---

## 📁 Project Structure

```
poly-copybot-fork/
├── src/                    # Bot backend (TypeScript)
│   ├── services/
│   │   ├── userManager.ts
│   │   ├── tradeMonitor-multiuser.ts
│   │   └── tradeExecutor-multiuser.ts
│   └── index-multiuser.ts
├── web/                    # Next.js SaaS frontend
│   ├── app/
│   │   ├── (auth)/         # Login, Register
│   │   ├── (dashboard)/    # Dashboard, Positions, Traders, Settings
│   │   ├── (marketing)/    # Landing, Pricing
│   │   └── api/            # REST API routes
│   ├── components/
│   └── lib/
├── Dockerfile              # Bot Docker config
├── docker-compose.yml      # Full stack deployment
├── setup.sh                # Automated Stripe setup
├── deploy.sh               # Deployment script
└── LAUNCH_CHECKLIST.md     # Step-by-step launch guide
```

---

## 📖 Documentation

- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** - Complete launch guide
- **[COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md)** - Market research
- **[docs/](./docs/)** - Original bot documentation

---

## 🔒 Security

- **Private keys are encrypted** with AES-256-GCM
- **Non-custodial** - Users keep control of their wallets
- **No seed phrases stored** - Only private keys for signing
- **Rate limiting** on API routes
- **Input validation** on all forms

---

## 📊 Market Opportunity

Polymarket is the largest prediction market with millions in daily volume. Copy trading is a proven model in crypto (Binance, Bybit).

**Target market**: 1,000-10,000 users willing to pay for automation

**Revenue potential**: $59K-$590K/month at $59 average

---

## 🛠️ Development

```bash
# Web development
cd web && npm run dev

# Bot development (single-user)
npm run dev

# Bot development (multi-user SaaS)
npm run dev:multiuser

# Run tests
npm test

# Build for production
npm run build
```

---

## 📝 License

MIT License - See [LICENSE](LICENSE.md)

---

## 🤝 Credits

- Original bot by [ZeljkoMarinkovic](https://github.com/ZeljkoMarinkovic/Polymarket-Copy-Trading-Bot)
- SaaS platform by [Yan Labs](https://github.com/yan-labs)

---

## ⚠️ Disclaimer

This software is for educational purposes. Trading involves risk of loss. The developers are not responsible for any financial losses.

---

**Questions?** Open an issue or reach out on Telegram.