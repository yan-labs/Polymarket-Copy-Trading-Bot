import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Settings from '@/models/Settings';

// Bot status is stored in a separate collection
const mongoose = require('mongoose');

const BotStatusSchema = new mongoose.Schema({
    _id: { type: String, default: 'bot_status' },
    isRunning: { type: Boolean, default: false },
    lastHeartbeat: { type: Date },
    traderCount: { type: Number, default: 0 },
    userCount: { type: Number, default: 0 },
    tradesToday: { type: Number, default: 0 },
    errors: [{ timestamp: Date, message: String }],
}, { timestamps: true });

const BotStatus = mongoose.models.BotStatus || mongoose.model('BotStatus', BotStatusSchema);

export async function GET() {
    try {
        await connectDB();
        
        // Get bot status
        let botStatus = await BotStatus.findById('bot_status');
        
        if (!botStatus) {
            // Create default status
            botStatus = await BotStatus.create({
                _id: 'bot_status',
                isRunning: false,
                lastHeartbeat: null,
                traderCount: 0,
                userCount: 0,
                tradesToday: 0,
            });
        }
        
        // Check if bot is actually alive (heartbeat within last 60 seconds)
        const isAlive = botStatus.lastHeartbeat && 
            (new Date().getTime() - new Date(botStatus.lastHeartbeat).getTime()) < 60000;
        
        // Get actual user count
        const userCount = await User.countDocuments({ proxyWallet: { $exists: true, $ne: '' } });
        
        // Get total followed traders
        const settings = await Settings.find({ followedTraders: { $exists: true, $ne: [] } });
        const traderCount = new Set(
            settings.flatMap(s => s.followedTraders.map((t: string) => t.toLowerCase()))
        ).size;
        
        return NextResponse.json({
            success: true,
            data: {
                isRunning: isAlive,
                lastHeartbeat: botStatus.lastHeartbeat,
                traderCount,
                userCount,
                tradesToday: botStatus.tradesToday,
                errors: botStatus.errors?.slice(-10) || [],
            },
        });
    } catch (error) {
        console.error('Error fetching bot status:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch bot status' },
            { status: 500 }
        );
    }
}