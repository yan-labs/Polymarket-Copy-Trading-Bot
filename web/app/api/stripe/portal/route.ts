import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const user = await User.findById(session.user.id);
    
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No Stripe customer found' 
      }, { status: 400 });
    }
    
    // Create portal session
    const portalSession = await createPortalSession(
      user.stripeCustomerId,
      `${process.env.NEXTAUTH_URL}/settings`
    );
    
    return NextResponse.json({ 
      url: portalSession.url 
    });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ 
      error: 'Failed to create portal session' 
    }, { status: 500 });
  }
}