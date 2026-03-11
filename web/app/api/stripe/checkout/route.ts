import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, getOrCreateStripeCustomer, STRIPE_PRICES } from '@/lib/stripe';

type TierKey = 'basic' | 'pro' | 'enterprise';
type BillingPeriod = 'monthly' | 'yearly';

export async function POST(request: NextRequest) {
  try {
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
    
    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email!,
      session.user.name ?? undefined
    );
    
    // Get price ID
    const priceId = STRIPE_PRICES[tier as TierKey]?.[billingPeriod as BillingPeriod];
    
    if (!priceId || priceId.startsWith('price_') === false) {
      return NextResponse.json({ 
        error: 'Price not configured. Please create products in Stripe Dashboard first.',
        hint: 'Update STRIPE_PRICES in lib/stripe.ts with actual Stripe Price IDs'
      }, { status: 500 });
    }
    
    // Create checkout session
    const checkoutSession = await createCheckoutSession(
      customerId,
      priceId,
      `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
      `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`
    );
    
    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ 
      error: 'Failed to create checkout session' 
    }, { status: 500 });
  }
}