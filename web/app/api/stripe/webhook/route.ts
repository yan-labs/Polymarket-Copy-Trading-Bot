import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';
import { TIER_LIMITS, SubscriptionTier, SubscriptionStatus } from '@/models/User';

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify webhook signature
    const event = verifySignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    await connectDB();
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      
      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

// Handle checkout completion
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }
  
  // Get subscription details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  
  // Determine tier from price ID
  const tier = getTierFromPriceId(priceId);
  
  // Get period dates
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;
  
  // Update user
  await User.findByIdAndUpdate(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionTier: tier,
    subscriptionStatus: subscription.status as SubscriptionStatus,
    subscriptionCurrentPeriodStart: new Date(periodStart * 1000),
    subscriptionCurrentPeriodEnd: new Date(periodEnd * 1000),
    tradersLimit: TIER_LIMITS[tier]?.traders || 1,
    cancelAtPeriodEnd: false,
  });
  
  console.log(`✅ Subscription created for user ${userId}: ${tier}`);
}

// Handle subscription update
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceId = (subscription as any).items?.data?.[0]?.price?.id || subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }
  
  // Get period dates (Stripe uses snake_case in API but TypeScript types may differ)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodStart = (subscription as any).current_period_start;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodEnd = (subscription as any).current_period_end;
  
  // Update user subscription
  await User.findByIdAndUpdate(user._id, {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionTier: tier,
    subscriptionStatus: subscription.status as SubscriptionStatus,
    subscriptionCurrentPeriodStart: new Date(periodStart * 1000),
    subscriptionCurrentPeriodEnd: new Date(periodEnd * 1000),
    tradersLimit: TIER_LIMITS[tier]?.traders || 1,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
  
  console.log(`📝 Subscription updated for user ${user._id}: ${tier} (${subscription.status})`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }
  
  // Downgrade to free tier
  await User.findByIdAndUpdate(user._id, {
    subscriptionTier: 'free',
    subscriptionStatus: 'canceled',
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionCurrentPeriodStart: null,
    subscriptionCurrentPeriodEnd: null,
    tradersLimit: TIER_LIMITS.free.traders,
    cancelAtPeriodEnd: false,
  });
  
  console.log(`❌ Subscription canceled for user ${user._id}`);
}

// Handle invoice paid
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  console.log(`💳 Invoice paid for customer ${customerId}`);
  
  // Reset monthly trade count when invoice is paid (new billing period)
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      tradesThisMonth: 0,
    });
    console.log(`🔄 Reset trade count for user ${user._id}`);
  }
}

// Handle payment failed
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'past_due',
    });
    console.log(`⚠️ Payment failed for user ${user._id}`);
  }
}

// Determine tier from Stripe price ID
function getTierFromPriceId(priceId: string): SubscriptionTier {
  // This maps price IDs back to tiers
  // You can customize this based on your Stripe product structure
  const priceIdLower = priceId.toLowerCase();
  
  if (priceIdLower.includes('enterprise') || priceIdLower.includes('99')) {
    return 'enterprise';
  }
  if (priceIdLower.includes('pro') || priceIdLower.includes('59')) {
    return 'pro';
  }
  if (priceIdLower.includes('basic') || priceIdLower.includes('29')) {
    return 'basic';
  }
  
  // Default to free
  return 'free';
}