import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import Settings from '@/models/Settings';
import connectDB from '@/lib/mongodb';
import { TIER_LIMITS } from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if trial has expired
    let effectiveTier = user.subscriptionTier || 'free';
    let effectiveStatus = user.subscriptionStatus;
    const now = new Date();
    
    if (user.trialEndsAt && new Date(user.trialEndsAt) < now) {
      // Trial has expired - downgrade to free
      effectiveTier = 'free';
      effectiveStatus = undefined;
      
      // Update user in background (don't await)
      User.findByIdAndUpdate(session.user.id, {
        subscriptionTier: 'free',
        subscriptionStatus: undefined,
        trialEndsAt: undefined,
        tradersLimit: TIER_LIMITS.free.traders,
      }).catch(err => console.error('Failed to downgrade expired trial:', err));
    }
    
    // Count followed traders from Settings
    const settings = await Settings.findOne({ userId: session.user.id });
    const tradersCount = settings?.followedTraders?.length || 0;
    
    // Calculate trial days remaining
    let trialDaysRemaining: number | undefined;
    if (user.trialEndsAt && new Date(user.trialEndsAt) > now) {
      const msRemaining = new Date(user.trialEndsAt).getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
    }
    
    return NextResponse.json({
      subscription: {
        tier: effectiveTier,
        status: effectiveStatus,
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
        tradesThisMonth: user.tradesThisMonth || 0,
        tradersCount,
        // Trial info
        trialEndsAt: user.trialEndsAt?.toISOString(),
        trialDaysRemaining,
        trialTier: user.trialTier,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}