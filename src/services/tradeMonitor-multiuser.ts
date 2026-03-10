import { ENV } from '../config/env';
import { getUserActivityModel, getUserPositionModel } from '../models/userHistory';
import fetchData from '../utils/fetchData';
import Logger from '../utils/logger';
import userManager, { UserWithSettings } from './userManager';

const TOO_OLD_TIMESTAMP = ENV.TOO_OLD_TIMESTAMP;
const FETCH_INTERVAL = ENV.FETCH_INTERVAL;

// Map of trader address -> users following that trader
let traderToUsersMap = new Map<string, UserWithSettings[]>();
// List of all trader addresses to monitor
let traderAddresses: string[] = [];
// Models for each trader
const traderModels = new Map<string, {
    UserActivity: ReturnType<typeof getUserActivityModel>;
    UserPosition: ReturnType<typeof getUserPositionModel>;
}>();

/**
 * Initialize the trade monitor with multi-user support
 */
const init = async () => {
    // Connect to MongoDB
    await userManager.connectDB(ENV.MONGO_URI);
    
    // Load all active users and build trader map
    traderToUsersMap = await userManager.getAllFollowedTraders();
    traderAddresses = Array.from(traderToUsersMap.keys());
    
    // Create models for each trader
    for (const address of traderAddresses) {
        const UserActivity = getUserActivityModel(address);
        const UserPosition = getUserPositionModel(address);
        traderModels.set(address, { UserActivity, UserPosition });
    }
    
    Logger.clearLine();
    Logger.info(`✓ Monitoring ${traderAddresses.length} trader(s) for ${traderToUsersMap.size} unique addresses`);
    
    // Log users and their followed traders
    const users = await userManager.getActiveUsers();
    Logger.info(`✓ Active users: ${users.length}`);
    
    // Show positions for each user
    for (const userWithSettings of users) {
        const { user, settings } = userWithSettings;
        try {
            const positionsUrl = `https://data-api.polymarket.com/positions?user=${user.proxyWallet}`;
            const positions = await fetchData(positionsUrl);
            
            if (Array.isArray(positions) && positions.length > 0) {
                Logger.info(
                    `  ${user.email}: ${positions.length} positions, following ${settings.followedTraders.length} traders`
                );
            } else {
                Logger.info(
                    `  ${user.email}: 0 positions, following ${settings.followedTraders.length} traders`
                );
            }
        } catch (error) {
            Logger.error(`  ${user.email}: Error fetching positions`);
        }
    }
};

/**
 * Refresh trader list (call when settings are updated)
 */
const refreshTraders = async () => {
    Logger.info('Refreshing trader list...');
    
    const newTraderToUsersMap = await userManager.getAllFollowedTraders(true);
    const newTraderAddresses = Array.from(newTraderToUsersMap.keys());
    
    // Add new traders
    for (const address of newTraderAddresses) {
        if (!traderModels.has(address)) {
            const UserActivity = getUserActivityModel(address);
            const UserPosition = getUserPositionModel(address);
            traderModels.set(address, { UserActivity, UserPosition });
            Logger.info(`  + Added trader ${address.slice(0, 6)}...${address.slice(-4)}`);
        }
    }
    
    // Remove traders that are no longer followed
    for (const address of traderAddresses) {
        if (!newTraderToUsersMap.has(address)) {
            traderModels.delete(address);
            Logger.info(`  - Removed trader ${address.slice(0, 6)}...${address.slice(-4)}`);
        }
    }
    
    traderToUsersMap = newTraderToUsersMap;
    traderAddresses = newTraderAddresses;
    
    Logger.info(`✓ Now monitoring ${traderAddresses.length} traders`);
};

/**
 * Fetch trade data for all monitored traders
 */
const fetchTradeData = async () => {
    for (const address of traderAddresses) {
        try {
            const models = traderModels.get(address);
            if (!models) continue;
            
            const { UserActivity, UserPosition } = models;
            
            // Fetch trade activities from Polymarket API
            const apiUrl = `https://data-api.polymarket.com/activity?user=${address}&type=TRADE`;
            const activities = await fetchData(apiUrl);
            
            if (!Array.isArray(activities) || activities.length === 0) {
                continue;
            }
            
            // Process each activity
            for (const activity of activities) {
                // Skip if too old
                if (activity.timestamp < TOO_OLD_TIMESTAMP) {
                    continue;
                }
                
                // Check if this trade already exists in database
                const existingActivity = await UserActivity.findOne({
                    transactionHash: activity.transactionHash,
                }).exec();
                
                if (existingActivity) {
                    continue; // Already processed this trade
                }
                
                // Save new trade to database
                const newActivity = new UserActivity({
                    proxyWallet: activity.proxyWallet,
                    timestamp: activity.timestamp,
                    conditionId: activity.conditionId,
                    type: activity.type,
                    size: activity.size,
                    usdcSize: activity.usdcSize,
                    transactionHash: activity.transactionHash,
                    price: activity.price,
                    asset: activity.asset,
                    side: activity.side,
                    outcomeIndex: activity.outcomeIndex,
                    title: activity.title,
                    slug: activity.slug,
                    icon: activity.icon,
                    eventSlug: activity.eventSlug,
                    outcome: activity.outcome,
                    name: activity.name,
                    pseudonym: activity.pseudonym,
                    bio: activity.bio,
                    profileImage: activity.profileImage,
                    profileImageOptimized: activity.profileImageOptimized,
                    bot: false,
                    botExcutedTime: 0,
                });
                
                await newActivity.save();
                
                // Get users following this trader
                const followingUsers = traderToUsersMap.get(address) || [];
                Logger.info(
                    `🔔 New trade detected: ${address.slice(0, 6)}...${address.slice(-4)} - ` +
                    `${activity.side} ${activity.size} of "${activity.title}" - ` +
                    `Notifying ${followingUsers.length} user(s)`
                );
                
                // TODO: Notify users (via WebSocket or save to notification collection)
                // For now, just log it
                for (const { user } of followingUsers) {
                    Logger.info(`    → Notifying ${user.email}`);
                }
            }
            
            // Also fetch and update positions
            const positionsUrl = `https://data-api.polymarket.com/positions?user=${address}`;
            const positions = await fetchData(positionsUrl);
            
            if (Array.isArray(positions) && positions.length > 0) {
                for (const position of positions) {
                    // Update or create position
                    await UserPosition.findOneAndUpdate(
                        { asset: position.asset, conditionId: position.conditionId },
                        {
                            proxyWallet: position.proxyWallet,
                            asset: position.asset,
                            conditionId: position.conditionId,
                            size: position.size,
                            avgPrice: position.avgPrice,
                            initialValue: position.initialValue,
                            currentValue: position.currentValue,
                            cashPnl: position.cashPnl,
                            percentPnl: position.percentPnl,
                            totalBought: position.totalBought,
                            realizedPnl: position.realizedPnl,
                            percentRealizedPnl: position.percentRealizedPnl,
                            curPrice: position.curPrice,
                            redeemable: position.redeemable,
                            mergeable: position.mergeable,
                            title: position.title,
                            slug: position.slug,
                            icon: position.icon,
                            eventSlug: position.eventSlug,
                            outcome: position.outcome,
                            outcomeIndex: position.outcomeIndex,
                            oppositeOutcome: position.oppositeOutcome,
                            oppositeAsset: position.oppositeAsset,
                            endDate: position.endDate,
                            negativeRisk: position.negativeRisk,
                        },
                        { upsert: true }
                    );
                }
            }
        } catch (error) {
            Logger.error(
                `Error fetching data for ${address.slice(0, 6)}...${address.slice(-4)}: ${error}`
            );
        }
    }
};

// Track if this is the first run
let isFirstRun = true;
// Track if monitor should continue running
let isRunning = false;
// Refresh interval for trader list (every 30 seconds)
const TRADER_REFRESH_INTERVAL = 30000;
let lastTraderRefresh = 0;

/**
 * Stop the trade monitor gracefully
 */
export const stopTradeMonitor = () => {
    isRunning = false;
    Logger.info('Trade monitor shutdown requested...');
};

/**
 * Get current monitor status
 */
export const getMonitorStatus = () => {
    return {
        isRunning,
        traderCount: traderAddresses.length,
        traders: traderAddresses,
    };
};

/**
 * Trigger a refresh of the trader list
 */
export const triggerRefresh = async () => {
    if (isRunning) {
        await refreshTraders();
    }
};

const tradeMonitor = async () => {
    await init();
    isRunning = true;
    
    Logger.success(`Monitoring ${traderAddresses.length} trader(s) every ${FETCH_INTERVAL}s`);
    Logger.separator();
    
    // On first run, mark all existing historical trades as already processed
    if (isFirstRun) {
        Logger.info('First run: marking all historical trades as processed...');
        for (const [address, models] of traderModels) {
            const { UserActivity } = models;
            const count = await UserActivity.updateMany(
                { bot: false },
                { $set: { bot: true, botExcutedTime: 999 } }
            );
            if (count.modifiedCount > 0) {
                Logger.info(
                    `Marked ${count.modifiedCount} historical trades as processed for ${address.slice(0, 6)}...${address.slice(-4)}`
                );
            }
        }
        isFirstRun = false;
        Logger.success('\nHistorical trades processed. Now monitoring for new trades only.');
        Logger.separator();
    }
    
    while (isRunning) {
        const now = Date.now();
        
        // Refresh trader list periodically
        if (now - lastTraderRefresh > TRADER_REFRESH_INTERVAL) {
            await refreshTraders();
            lastTraderRefresh = now;
        }
        
        await fetchTradeData();
        
        if (!isRunning) break;
        await new Promise((resolve) => setTimeout(resolve, FETCH_INTERVAL * 1000));
    }
    
    Logger.info('Trade monitor stopped');
};

export default tradeMonitor;