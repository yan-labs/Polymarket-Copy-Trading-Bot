import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';

export interface IUser extends Document {
  email: string;
  password: string;
  proxyWallet: string;
  privateKey?: string;
  name?: string;
  // Subscription fields
  subscriptionTier: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionCurrentPeriodStart?: Date;
  subscriptionCurrentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  // Usage tracking
  tradesThisMonth: number;
  tradersLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

// Pricing tier limits
export const TIER_LIMITS: Record<SubscriptionTier, { traders: number; price: number; name: string }> = {
  free: { traders: 1, price: 0, name: 'Free' },
  basic: { traders: 5, price: 29, name: 'Basic' },
  pro: { traders: 20, price: 59, name: 'Pro' },
  enterprise: { traders: 100, price: 99, name: 'Enterprise' },
};

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    proxyWallet: {
      type: String,
      required: true,
    },
    privateKey: {
      type: String,
    },
    name: {
      type: String,
    },
    // Subscription fields
    subscriptionTier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    stripePriceId: {
      type: String,
    },
    subscriptionCurrentPeriodStart: {
      type: Date,
    },
    subscriptionCurrentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    // Usage tracking
    tradesThisMonth: {
      type: Number,
      default: 0,
    },
    tradersLimit: {
      type: Number,
      default: 1, // Free tier default
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;