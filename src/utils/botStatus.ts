import mongoose from 'mongoose';

const BotStatusSchema = new mongoose.Schema({
    _id: { type: String, default: 'bot_status' },
    isRunning: { type: Boolean, default: false },
    lastHeartbeat: { type: Date },
    traderCount: { type: Number, default: 0 },
    userCount: { type: Number, default: 0 },
    tradesToday: { type: Number, default: 0 },
    tradesTotal: { type: Number, default: 0 },
    errors: [{ timestamp: Date, message: String }],
}, { timestamps: true });

const BotStatus = mongoose.models.BotStatus || mongoose.model('BotStatus', BotStatusSchema);

/**
 * Update bot heartbeat
 */
export const updateHeartbeat = async (
    traderCount: number,
    userCount: number
): Promise<void> => {
    try {
        await BotStatus.findOneAndUpdate(
            { _id: 'bot_status' },
            {
                isRunning: true,
                lastHeartbeat: new Date(),
                traderCount,
                userCount,
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to update heartbeat:', error);
    }
};

/**
 * Increment trade count
 */
export const incrementTradeCount = async (): Promise<void> => {
    try {
        await BotStatus.findOneAndUpdate(
            { _id: 'bot_status' },
            {
                $inc: { tradesToday: 1, tradesTotal: 1 },
                lastHeartbeat: new Date(),
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to increment trade count:', error);
    }
};

/**
 * Log error
 */
export const logError = async (message: string): Promise<void> => {
    try {
        await BotStatus.findOneAndUpdate(
            { _id: 'bot_status' },
            {
                $push: {
                    errors: {
                        $each: [{ timestamp: new Date(), message }],
                        $slice: -100, // Keep last 100 errors
                    },
                },
                lastHeartbeat: new Date(),
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to log error:', error);
    }
};

/**
 * Mark bot as stopped
 */
export const markStopped = async (): Promise<void> => {
    try {
        await BotStatus.findOneAndUpdate(
            { _id: 'bot_status' },
            {
                isRunning: false,
                lastHeartbeat: new Date(),
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to mark bot as stopped:', error);
    }
};

/**
 * Reset daily trades (call at midnight)
 */
export const resetDailyTrades = async (): Promise<void> => {
    try {
        await BotStatus.findOneAndUpdate(
            { _id: 'bot_status' },
            { tradesToday: 0 },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to reset daily trades:', error);
    }
};

export default {
    updateHeartbeat,
    incrementTradeCount,
    logError,
    markStopped,
    resetDailyTrades,
};