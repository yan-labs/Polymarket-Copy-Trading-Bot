import mongoose from 'mongoose';
import Logger from '../utils/logger';

// User interface
interface IUser {
    _id: mongoose.Types.ObjectId;
    email: string;
    proxyWallet: string;
    privateKey?: string;
    name?: string;
}

// Settings interface
interface ISettings {
    userId: mongoose.Types.ObjectId;
    copyStrategy: string;
    copySize: number;
    maxOrderSizeUSD: number;
    minOrderSizeUSD: number;
    maxPositionSizeUSD?: number;
    maxDailyVolumeUSD?: number;
    tradeMultiplier?: number;
    followedTraders: string[];
    notifications: {
        email: boolean;
        telegram?: string;
        newTrade: boolean;
        positionClosed: boolean;
        dailySummary: boolean;
        riskAlerts?: boolean;
    };
}

// User with settings
export interface UserWithSettings {
    user: IUser;
    settings: ISettings;
}

// Mongoose schemas (must match web app)
const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        proxyWallet: { type: String, required: true },
        privateKey: { type: String },
        name: { type: String },
    },
    { timestamps: true }
);

const settingsSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        copyStrategy: { type: String, enum: ['PERCENTAGE', 'FIXED', 'ADAPTIVE'], default: 'PERCENTAGE' },
        copySize: { type: Number, default: 10 },
        maxOrderSizeUSD: { type: Number, default: 100 },
        minOrderSizeUSD: { type: Number, default: 1 },
        maxPositionSizeUSD: { type: Number },
        maxDailyVolumeUSD: { type: Number },
        adaptiveMinPercent: { type: Number },
        adaptiveMaxPercent: { type: Number },
        adaptiveThreshold: { type: Number },
        tradeMultiplier: { type: Number, default: 1 },
        followedTraders: { type: [String], default: [] },
        notifications: {
            email: { type: Boolean, default: true },
            telegram: { type: String },
            newTrade: { type: Boolean, default: true },
            positionClosed: { type: Boolean, default: true },
            dailySummary: { type: Boolean, default: false },
            riskAlerts: { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Cache for user settings (refresh every 30 seconds)
let userCache: UserWithSettings[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Connect to MongoDB
 */
export const connectDB = async (mongoUri: string): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
            Logger.info('✓ Connected to MongoDB');
        }
    } catch (error) {
        Logger.error(`Failed to connect to MongoDB: ${error}`);
        throw error;
    }
};

/**
 * Get all active users with their settings
 * Active users are those who have:
 * - A proxyWallet
 * - At least one followedTrader
 * - (Optional) privateKey for executing trades
 */
export const getActiveUsers = async (forceRefresh = false): Promise<UserWithSettings[]> => {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (!forceRefresh && now - lastCacheUpdate < CACHE_TTL && userCache.length > 0) {
        return userCache;
    }
    
    try {
        // Get all users with proxyWallet and privateKey
        const users = await User.find({
            proxyWallet: { $exists: true, $ne: '' },
        }).exec();
        
        const usersWithSettings: UserWithSettings[] = [];
        
        for (const user of users) {
            // Get settings for this user
            const settings = await Settings.findOne({ userId: user._id }).exec();
            
            if (!settings) {
                Logger.warning(`User ${user.email} has no settings, creating default...`);
                // Create default settings if not exist
                const newSettings = new Settings({
                    userId: user._id,
                    followedTraders: [],
                    copyStrategy: 'PERCENTAGE',
                    copySize: 10,
                    maxOrderSizeUSD: 100,
                    minOrderSizeUSD: 1,
                    notifications: {
                        email: true,
                        newTrade: true,
                        positionClosed: true,
                        dailySummary: false,
                    },
                });
                await newSettings.save();
                continue; // Skip users with no followed traders
            }
            
            // Only include users who have followed traders
            if (settings.followedTraders && settings.followedTraders.length > 0) {
                usersWithSettings.push({
                    user: user.toObject() as IUser,
                    settings: settings.toObject() as ISettings,
                });
            }
        }
        
        // Update cache
        userCache = usersWithSettings;
        lastCacheUpdate = now;
        
        Logger.info(`✓ Loaded ${usersWithSettings.length} active users`);
        return usersWithSettings;
    } catch (error) {
        Logger.error(`Failed to get active users: ${error}`);
        return userCache; // Return stale cache on error
    }
};

/**
 * Get a specific user by ID with settings
 */
export const getUserById = async (userId: string): Promise<UserWithSettings | null> => {
    try {
        const user = await User.findById(userId).exec();
        if (!user) return null;
        
        const settings = await Settings.findOne({ userId: user._id }).exec();
        if (!settings) return null;
        
        return {
            user: user.toObject() as IUser,
            settings: settings.toObject() as ISettings,
        };
    } catch (error) {
        Logger.error(`Failed to get user ${userId}: ${error}`);
        return null;
    }
};

/**
 * Get all unique trader addresses being followed across all users
 * Returns a map of trader address -> array of users following them
 */
export const getAllFollowedTraders = async (
    forceRefresh = false
): Promise<Map<string, UserWithSettings[]>> => {
    const users = await getActiveUsers(forceRefresh);
    const traderMap = new Map<string, UserWithSettings[]>();
    
    for (const userWithSettings of users) {
        for (const traderAddress of userWithSettings.settings.followedTraders) {
            const normalizedAddress = traderAddress.toLowerCase();
            
            if (!traderMap.has(normalizedAddress)) {
                traderMap.set(normalizedAddress, []);
            }
            
            traderMap.get(normalizedAddress)!.push(userWithSettings);
        }
    }
    
    return traderMap;
};

/**
 * Get all trader addresses to monitor (unique list)
 */
export const getTraderAddressesToMonitor = async (forceRefresh = false): Promise<string[]> => {
    const traderMap = await getAllFollowedTraders(forceRefresh);
    return Array.from(traderMap.keys());
};

/**
 * Clear cache (call when user updates settings)
 */
export const clearCache = (): void => {
    userCache = [];
    lastCacheUpdate = 0;
    Logger.info('✓ User cache cleared');
};

export default {
    connectDB,
    getActiveUsers,
    getUserById,
    getAllFollowedTraders,
    getTraderAddressesToMonitor,
    clearCache,
};