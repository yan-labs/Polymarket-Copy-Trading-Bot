import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { encryptPrivateKey, validatePrivateKey, maskPrivateKey } from '@/utils/encryption';

/**
 * PUT /api/wallet - Update user's wallet (proxy wallet and private key)
 * Body: { proxyWallet: string, privateKey: string }
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { proxyWallet, privateKey } = body;

        // Validate inputs
        if (!proxyWallet) {
            return NextResponse.json(
                { success: false, error: 'Proxy wallet address is required' },
                { status: 400 }
            );
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(proxyWallet)) {
            return NextResponse.json(
                { success: false, error: 'Invalid Ethereum address format' },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Update proxy wallet
        user.proxyWallet = proxyWallet;

        // If private key provided, validate and encrypt
        if (privateKey) {
            try {
                validatePrivateKey(privateKey);
                user.privateKey = encryptPrivateKey(privateKey);
            } catch (error) {
                return NextResponse.json(
                    { success: false, error: error instanceof Error ? error.message : 'Invalid private key' },
                    { status: 400 }
                );
            }
        }

        await user.save();

        return NextResponse.json({
            success: true,
            data: {
                proxyWallet: user.proxyWallet,
                privateKeyMasked: user.privateKey ? maskPrivateKey(privateKey) : null,
                hasPrivateKey: !!user.privateKey
            }
        });
    } catch (error) {
        console.error('Error updating wallet:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update wallet' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/wallet - Get user's wallet info
 */
export async function GET() {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                proxyWallet: user.proxyWallet || null,
                hasPrivateKey: !!user.privateKey
            }
        });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch wallet' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/wallet - Remove user's private key (keep proxy wallet)
 */
export async function DELETE() {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        user.privateKey = undefined;
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Private key removed successfully'
        });
    } catch (error) {
        console.error('Error removing private key:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to remove private key' },
            { status: 500 }
        );
    }
}