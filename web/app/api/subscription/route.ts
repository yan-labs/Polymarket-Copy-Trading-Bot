import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import Settings from '@/models/Settings';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const user = await User.findById(session.user.id).select(
      'subscriptionTier subscriptionStatus subscriptionCurrentPeriodEnd cancelAtPeriodEnd tradesThisMonth tradersLimit'
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Count followed traders from Settings
    const settings = await Settings.findOne({ userId: session.user.id });
    const tradersCount = settings?.followedTraders?.length || 0;
    
    return NextResponse.json({
      subscription: {
        tier: user.subscriptionTier || 'free',
        status: user.subscriptionStatus,
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
        tradesThisMonth: user.tradesThisMonth || 0,
        tradersCount,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}