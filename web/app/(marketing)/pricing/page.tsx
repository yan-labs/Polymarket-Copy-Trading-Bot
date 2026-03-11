'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    price: 0,
    description: 'Try out copy trading',
    features: [
      '1 trader to follow',
      'Basic trade copying',
      'Email notifications',
      'Community support',
    ],
    tier: 'free' as const,
    popular: false,
  },
  {
    name: 'Basic',
    price: 29,
    description: 'For casual traders',
    features: [
      '5 traders to follow',
      'Advanced copy strategies',
      'Real-time notifications',
      'Position tracking',
      'Priority support',
    ],
    tier: 'basic' as const,
    popular: false,
  },
  {
    name: 'Pro',
    price: 59,
    description: 'For serious traders',
    features: [
      '20 traders to follow',
      'Custom copy strategies',
      'Advanced analytics',
      'API access',
      'Priority support',
      'Private Discord',
    ],
    tier: 'pro' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'For professional traders',
    features: [
      '100 traders to follow',
      'Custom strategies',
      'Advanced analytics',
      'API access',
      'Dedicated support',
      'Private Discord',
      'White-label options',
    ],
    tier: 'enterprise' as const,
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectPlan = async (tier: string) => {
    if (tier === 'free') {
      router.push('/register');
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setLoading(null);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Polymarket Copy Trading</h1>
            <nav className="flex gap-4">
              <a href="/login" className="text-gray-400 hover:text-white transition">
                Sign In
              </a>
              <a href="/register" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition">
                Get Started
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your trading style. All plans include core features.
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <span className={billingPeriod === 'monthly' ? 'text-white' : 'text-gray-400'}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-8 bg-gray-700 rounded-full transition-colors"
            >
              <div
                className={`absolute w-6 h-6 bg-blue-600 rounded-full top-1 transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={billingPeriod === 'yearly' ? 'text-white' : 'text-gray-400'}>
              Yearly <span className="text-green-500">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 ${
                tier.popular
                  ? 'bg-gradient-to-b from-blue-600/20 to-blue-900/20 border-2 border-blue-500'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="text-4xl font-bold mb-2">
                  ${billingPeriod === 'yearly' ? Math.floor(tier.price * 10) : tier.price}
                  <span className="text-lg text-gray-400">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(tier.tier)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  tier.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                } ${loading === tier.tier ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === tier.tier ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : tier.tier === 'free' ? (
                  'Get Started'
                ) : (
                  `Subscribe ${tier.name}`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h3>
          
          <div className="space-y-6">
            <details className="bg-gray-800 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">Can I change plans later?</summary>
              <p className="mt-4 text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </details>

            <details className="bg-gray-800 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">What payment methods do you accept?</summary>
              <p className="mt-4 text-gray-400">
                We accept all major credit cards (Visa, MasterCard, American Express) via Stripe. All payments are securely processed.
              </p>
            </details>

            <details className="bg-gray-800 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">Is there a free trial?</summary>
              <p className="mt-4 text-gray-400">
                The Free tier lets you follow 1 trader to test the platform. Paid plans unlock more traders and advanced features.
              </p>
            </details>

            <details className="bg-gray-800 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">How do I cancel my subscription?</summary>
              <p className="mt-4 text-gray-400">
                You can cancel anytime from your Settings page. Your subscription will remain active until the end of the current billing period.
              </p>
            </details>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>© 2026 Polymarket Copy Trading. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}