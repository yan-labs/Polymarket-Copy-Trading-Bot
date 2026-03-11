// Subscription types - can be imported by client components
// This file should NOT import mongoose or any Node.js modules

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';

// Pricing tier limits
export const TIER_LIMITS: Record<SubscriptionTier, { traders: number; price: number; name: string }> = {
  free: { traders: 1, price: 0, name: 'Free' },
  basic: { traders: 5, price: 29, name: 'Basic' },
  pro: { traders: 20, price: 59, name: 'Pro' },
  enterprise: { traders: 100, price: 99, name: 'Enterprise' },
};

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  tradesThisMonth?: number;
  tradersCount?: number;
}