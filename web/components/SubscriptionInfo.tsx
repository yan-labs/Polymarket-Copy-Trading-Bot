'use client';

import { useState } from 'react';
import { Check, X, CreditCard, Calendar, AlertCircle, Loader2, Clock, Gift } from 'lucide-react';
import { TIER_LIMITS, SubscriptionTier, SubscriptionStatus } from '@/types/subscription';

interface SubscriptionInfoProps {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  tradesThisMonth?: number;
  tradersCount?: number;
  // Trial props
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  trialTier?: SubscriptionTier;
  // Demo mode
  isDemo?: boolean;
}

export default function SubscriptionInfo({
  tier,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  tradesThisMonth = 0,
  tradersCount = 0,
  trialEndsAt,
  trialDaysRemaining,
  trialTier,
  isDemo = false,
}: SubscriptionInfoProps) {
  const [loading, setLoading] = useState(false);

  const tierInfo = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const isTrial = trialEndsAt && trialDaysRemaining && trialDaysRemaining > 0;

  const handleManageSubscription = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
        setLoading(false);
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    // Show demo badge if demo mode
    if (isDemo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
          <AlertCircle className="w-3 h-3" />
          Demo
        </span>
      );
    }

    // Show trial badge if on trial
    if (isTrial) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
          <Gift className="w-3 h-3" />
          {trialDaysRemaining} days left
        </span>
      );
    }

    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            <Check className="w-3 h-3" />
            Active
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
            <X className="w-3 h-3" />
            Canceled
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
            <AlertCircle className="w-3 h-3" />
            Past Due
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            <Clock className="w-3 h-3" />
            Trialing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
            Free Plan
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subscription</h3>
        {getStatusBadge()}
      </div>

      {/* Trial Banner */}
      {isTrial && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-purple-300 font-medium">Free Trial Active</p>
              <p className="text-gray-300 text-sm mt-1">
                You have <span className="font-bold text-white">{trialDaysRemaining} days</span> left of your 
                {' '}<span className="font-bold text-white">{trialTier || 'Pro'}</span> trial.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Enjoy unlimited access to all features. Subscribe to keep your access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium">Demo Mode Active</p>
              <p className="text-gray-300 text-sm mt-1">
                You&apos;re using a demo subscription. No payment was processed.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                This is for testing purposes only. Set up Stripe payments for production use.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Current Plan</p>
          <p className="text-2xl font-bold">{tierInfo.name}</p>
          <p className="text-gray-400 text-sm">${tierInfo.price}/month</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Traders Limit</p>
          <p className="text-2xl font-bold">{tradersCount} / {tierInfo.traders}</p>
          <p className="text-gray-400 text-sm">
            {tierInfo.traders - tradersCount} slots remaining
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-400 text-sm">Trades This Month</p>
          <p className="font-semibold">{tradesThisMonth}</p>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min((tradesThisMonth / 1000) * 100, 100)}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-1">Resets on billing date</p>
      </div>

      {/* Trial Ending Notice */}
      {isTrial && trialDaysRemaining && trialDaysRemaining <= 3 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Trial Ending Soon!</p>
              <p className="text-gray-400 text-sm mt-1">
                Your trial ends in {trialDaysRemaining} days. Subscribe now to keep your access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Notice */}
      {cancelAtPeriodEnd && currentPeriodEnd && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Subscription Canceling</p>
              <p className="text-gray-400 text-sm mt-1">
                Your subscription will end on{' '}
                {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                . You can still use all features until then.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Date */}
      {currentPeriodEnd && !cancelAtPeriodEnd && tier !== 'free' && !isTrial && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Calendar className="w-4 h-4" />
          <span>
            Next billing date:{' '}
            {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {tier === 'free' && !isTrial ? (
          <a
            href="/pricing"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition text-center"
          >
            Upgrade Plan
          </a>
        ) : isTrial ? (
          <a
            href="/pricing"
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition text-center"
          >
            Subscribe Now
          </a>
        ) : (
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Manage Subscription
              </>
            )}
          </button>
        )}
      </div>

      {/* Plan Comparison */}
      {tier !== 'enterprise' && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <p className="text-gray-400 text-sm mb-3">
            Need more traders?{' '}
            <a href="/pricing" className="text-blue-400 hover:underline">
              View all plans →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}