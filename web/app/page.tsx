import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Wallet,
  Clock,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Auto Copy Trading",
    description:
      "Automatically copy trades from top Polymarket traders. Never miss a winning bet.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description:
      "Set your own risk parameters. Control position sizes and stop losses.",
  },
  {
    icon: Zap,
    title: "Real-time Execution",
    description:
      "Trades are copied instantly. Our system monitors 24/7 so you don't have to.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track your P&L, win rate, and portfolio performance in real-time.",
  },
  {
    icon: Wallet,
    title: "Multi-Wallet Support",
    description:
      "Manage multiple wallets and diversify your copy trading strategies.",
  },
  {
    icon: Clock,
    title: "24/7 Monitoring",
    description:
      "Our bot never sleeps. Continuous monitoring of trader activities.",
  },
]

const pricingPlans = [
  {
    name: "Basic",
    price: "$29",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "1 Wallet",
      "Up to 3 Traders to Follow",
      "Real-time Copy Trading",
      "Basic Analytics",
      "Email Support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$59",
    period: "/month",
    description: "For serious traders",
    features: [
      "3 Wallets",
      "Up to 10 Traders to Follow",
      "Real-time Copy Trading",
      "Advanced Analytics",
      "Telegram Notifications",
      "Priority Support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For professional operations",
    features: [
      "Unlimited Wallets",
      "Unlimited Traders",
      "Real-time Copy Trading",
      "Full Analytics Suite",
      "Telegram & Discord Notifications",
      "API Access",
      "Dedicated Support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">PolyCopy</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight">
            Copy Trade Like a{" "}
            <span className="text-indigo-600">Pro</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Automatically copy trades from top Polymarket traders. Set it up once,
            let it run forever. Join hundreds of traders already profiting.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8">
              View Demo
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required • 7-day free trial
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to automate your Polymarket trading
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose the plan that fits your trading style
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-4"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.popular && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-white text-indigo-600 rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3
                  className={`text-xl font-semibold ${
                    plan.popular ? "text-white" : "text-gray-900"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`mt-2 ${
                    plan.popular ? "text-indigo-100" : "text-gray-500"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mt-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.popular ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={plan.popular ? "text-indigo-100" : "text-gray-500"}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          plan.popular ? "text-indigo-200" : "text-indigo-600"
                        }`}
                      />
                      <span
                        className={
                          plan.popular ? "text-white" : "text-gray-600"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block mt-8">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "secondary" : "default"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to Start Copy Trading?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Join our growing community of traders. Set up your first copy trade in minutes.
          </p>
          <Link href="/register" className="inline-block mt-8">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">PolyCopy</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 PolyCopy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}