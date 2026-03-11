import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User, { SubscriptionTier, TIER_LIMITS } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

type TierKey = 'basic' | 'pro' | 'enterprise';

/**
 * Demo checkout route - allows subscribing without Stripe when DEMO_MODE is enabled
 * 
 * This is for testing purposes only. In production, use the normal Stripe checkout flow.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if demo mode is enabled
    if (process.env.DEMO_MODE !== 'true') {
      return NextResponse.json({ 
        error: 'Demo mode is not enabled. Set DEMO_MODE=true in your environment.' 
      }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tier, billingPeriod = 'monthly' } = body;
    
    if (!tier || !['basic', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Update user subscription
    const tierLimit = TIER_LIMITS[tier as SubscriptionTier];
    const periodEnd = new Date();
    if (billingPeriod === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        tradersLimit: tierLimit.traders,
        subscriptionCurrentPeriodStart: new Date(),
        subscriptionCurrentPeriodEnd: periodEnd,
        // Demo-specific fields
        stripeCustomerId: `demo_customer_${session.user.id}`,
        stripeSubscriptionId: `demo_subscription_${tier}_${Date.now()}`,
        stripePriceId: `demo_price_${tier}_${billingPeriod}`,
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[Demo Mode] User ${session.user.email} subscribed to ${tier} (${billingPeriod})`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Demo subscription activated',
      tier,
      billingPeriod,
      tradersLimit: tierLimit.traders,
      periodEnd: periodEnd.toISOString(),
      isDemo: true,
    });
  } catch (error) {
    console.error('Demo checkout error:', error);
    return NextResponse.json({ 
      error: 'Failed to activate demo subscription' 
    }, { status: 500 });
  }
}