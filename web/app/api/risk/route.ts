import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Settings } from '@/models/Settings';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/risk - Get user's risk settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const settings = await Settings.findOne({ userId: session.user.id });
    
    if (!settings) {
      return NextResponse.json({ 
        riskSettings: {
          autoPause: {
            enabled: false,
            maxDrawdownPercent: 20,
            maxDailyLoss: 100,
          },
          positionLimits: {
            maxOpenPositions: 10,
            maxTotalExposure: 1000,
            maxSingleBet: 100,
          },
          tradingHours: {
            enabled: false,
            startHour: 0,
            endHour: 24,
            timezone: 'UTC',
          },
        },
        traderRiskSettings: [],
      });
    }

    return NextResponse.json({ 
      riskSettings: settings.riskSettings || {
        autoPause: { enabled: false, maxDrawdownPercent: 20, maxDailyLoss: 100 },
        positionLimits: { maxOpenPositions: 10, maxTotalExposure: 1000, maxSingleBet: 100 },
        tradingHours: { enabled: false, startHour: 0, endHour: 24, timezone: 'UTC' },
      },
      traderRiskSettings: settings.traderRiskSettings || [],
    });
  } catch (error) {
    console.error('Error fetching risk settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/risk - Update user's risk settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { riskSettings, traderRiskSettings } = body;

    await connectToDatabase();
    
    const settings = await Settings.findOne({ userId: session.user.id });
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Update risk settings
    if (riskSettings) {
      settings.riskSettings = riskSettings;
    }

    // Update trader-specific risk settings
    if (traderRiskSettings) {
      settings.traderRiskSettings = traderRiskSettings;
    }

    await settings.save();

    return NextResponse.json({ 
      success: true,
      riskSettings: settings.riskSettings,
      traderRiskSettings: settings.traderRiskSettings,
    });
  } catch (error) {
    console.error('Error updating risk settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/risk - Add trader-specific risk settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { traderAddress, stopLossPercent, takeProfitPercent, maxPositionSize, trailingStop } = body;

    if (!traderAddress) {
      return NextResponse.json({ error: 'traderAddress is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const settings = await Settings.findOne({ userId: session.user.id });
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Initialize traderRiskSettings if not exists
    if (!settings.traderRiskSettings) {
      settings.traderRiskSettings = [];
    }

    // Check if trader already has risk settings
    const existingIndex = settings.traderRiskSettings.findIndex(
      (t: { traderAddress: string }) => t.traderAddress.toLowerCase() === traderAddress.toLowerCase()
    );

    const newTraderRisk = {
      traderAddress,
      enabled: true,
      stopLossPercent,
      takeProfitPercent,
      maxPositionSize,
      trailingStop: trailingStop || { enabled: false, trailPercent: 10 },
    };

    if (existingIndex >= 0) {
      // Update existing
      settings.traderRiskSettings[existingIndex] = newTraderRisk;
    } else {
      // Add new
      settings.traderRiskSettings.push(newTraderRisk);
    }

    await settings.save();

    return NextResponse.json({ 
      success: true,
      traderRiskSettings: settings.traderRiskSettings,
    });
  } catch (error) {
    console.error('Error adding trader risk settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/risk - Remove trader-specific risk settings
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const traderAddress = searchParams.get('traderAddress');

    if (!traderAddress) {
      return NextResponse.json({ error: 'traderAddress is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const settings = await Settings.findOne({ userId: session.user.id });
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Remove trader from risk settings
    if (settings.traderRiskSettings) {
      settings.traderRiskSettings = settings.traderRiskSettings.filter(
        (t: { traderAddress: string }) => t.traderAddress.toLowerCase() !== traderAddress.toLowerCase()
      );
    }

    await settings.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing trader risk settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}