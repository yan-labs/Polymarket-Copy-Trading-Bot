'use client';

import { useState } from 'react';
import { Check, X, CreditCard, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { TIER_LIMITS, SubscriptionTier, SubscriptionStatus } from '@/types/subscription';

interface SubscriptionInfoProps {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  tradesThisMonth?: number;
  tradersCount?: number;
}

export default function SubscriptionInfo({
  tier,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  tradesThisMonth = 0,
  tradersCount = 0,
}: SubscriptionInfoProps) {
  const [loading, setLoading] = useState(false);

  const tierInfo = TIER_LIMITS[tier] || TIER_LIMITS.free;

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
            <Calendar className="w-3 h-3" />
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
      {currentPeriodEnd && !cancelAtPeriodEnd && tier !== 'free' && (
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
        {tier === 'free' ? (
          <a
            href="/pricing"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition text-center"
          >
            Upgrade Plan
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