import Stripe from 'stripe';

// Initialize Stripe - handle missing key gracefully during build
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    // Return a mock during build or when key is not set
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      return null as unknown as Stripe;
    }
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });
};

export const stripe = getStripe();

// Pricing tier to Stripe Price ID mapping
// These will be created in Stripe Dashboard
export const STRIPE_PRICES: Record<string, { monthly: string; yearly: string }> = {
  // Replace with actual Stripe Price IDs after creating products in Stripe Dashboard
  basic: {
    monthly: 'price_basic_monthly', // $29/month
    yearly: 'price_basic_yearly',   // $290/year (2 months free)
  },
  pro: {
    monthly: 'price_pro_monthly',   // $59/month
    yearly: 'price_pro_yearly',     // $590/year (2 months free)
  },
  enterprise: {
    monthly: 'price_enterprise_monthly', // $99/month
    yearly: 'price_enterprise_yearly',  // $990/year (2 months free)
  },
};

// Create or get Stripe customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const { User } = await import('@/models/User');
  await import('@/lib/mongodb');
  
  const user = await User.findById(userId);
  
  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });
  
  // Update user with Stripe customer ID
  await User.findByIdAndUpdate(userId, {
    stripeCustomerId: customer.id,
  });
  
  return customer.id;
}

// Create checkout session for subscription
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
  });
  
  return session;
}

// Create customer portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session;
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
  
  // Cancel at period end
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Reactivate subscription
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}