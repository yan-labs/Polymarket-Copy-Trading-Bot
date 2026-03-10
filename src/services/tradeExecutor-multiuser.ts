import { ClobClient } from '@polymarket/clob-client';
import { UserActivityInterface, UserPositionInterface } from '../interfaces/User';
import { ENV } from '../config/env';
import { getUserActivityModel } from '../models/userHistory';
import fetchData from '../utils/fetchData';
import getMyBalance from '../utils/getMyBalance';
import postOrder from '../utils/postOrder';
import Logger from '../utils/logger';
import userManager, { UserWithSettings } from './userManager';
import { updateHeartbeat, incrementTradeCount, logError, markStopped } from '../utils/botStatus';
import { decryptPrivateKey } from '../utils/encryption';
import { createClobClientForUser } from '../utils/createClobClient';

const RETRY_LIMIT = ENV.RETRY_LIMIT;
const TRADE_AGGREGATION_ENABLED = ENV.TRADE_AGGREGATION_ENABLED;
const TRADE_AGGREGATION_WINDOW_SECONDS = ENV.TRADE_AGGREGATION_WINDOW_SECONDS;
const TRADE_AGGREGATION_MIN_TOTAL_USD = 1.0; // Polymarket minimum

interface TradeWithUser extends UserActivityInterface {
    traderAddress: string;
    followingUsers: UserWithSettings[];
}

interface AggregatedTrade {
    traderAddress: string;
    conditionId: string;
    asset: string;
    side: string;
    slug?: string;
    eventSlug?: string;
    trades: TradeWithUser[];
    totalUsdcSize: number;
    averagePrice: number;
    firstTradeTime: number;
    lastTradeTime: number;
    followingUsers: UserWithSettings[];
}

// Buffer for aggregating trades
const tradeAggregationBuffer: Map<string, AggregatedTrade> = new Map();

// Map of trader address -> users following that trader
let traderToUsersMap = new Map<string, UserWithSettings[]>();
// List of all trader addresses to monitor
let traderAddresses: string[] = [];

/**
 * Initialize the trade executor with multi-user support
 */
export const initExecutor = async () => {
    // Refresh trader map
    traderToUsersMap = await userManager.getAllFollowedTraders();
    traderAddresses = Array.from(traderToUsersMap.keys());
    Logger.info(`✓ Trade executor initialized: ${traderAddresses.length} traders to monitor`);
};

/**
 * Refresh trader list (call when settings are updated)
 */
export const refreshTraders = async () => {
    traderToUsersMap = await userManager.getAllFollowedTraders(true);
    traderAddresses = Array.from(traderToUsersMap.keys());
    Logger.info(`✓ Trade executor refreshed: ${traderAddresses.length} traders`);
};

/**
 * Read new trades that need to be copied
 */
const readNewTrades = async (): Promise<TradeWithUser[]> => {
    const allTrades: TradeWithUser[] = [];

    for (const address of traderAddresses) {
        const UserActivity = getUserActivityModel(address);
        
        // Only get trades that haven't been processed yet
        const trades = await UserActivity.find({
            $and: [{ type: 'TRADE' }, { bot: false }, { botExcutedTime: 0 }],
        }).exec();

        const followingUsers = traderToUsersMap.get(address) || [];

        const tradesWithUser = trades.map((trade) => ({
            ...(trade.toObject() as UserActivityInterface),
            traderAddress: address,
            followingUsers,
        }));

        allTrades.push(...tradesWithUser);
    }

    return allTrades;
};

/**
 * Generate a unique key for trade aggregation
 */
const getAggregationKey = (trade: TradeWithUser): string => {
    return `${trade.traderAddress}:${trade.conditionId}:${trade.asset}:${trade.side}`;
};

/**
 * Add trade to aggregation buffer
 */
const addToAggregationBuffer = (trade: TradeWithUser): void => {
    const key = getAggregationKey(trade);
    const existing = tradeAggregationBuffer.get(key);
    const now = Date.now();

    if (existing) {
        existing.trades.push(trade);
        existing.totalUsdcSize += trade.usdcSize;
        const totalValue = existing.trades.reduce((sum, t) => sum + t.usdcSize * t.price, 0);
        existing.averagePrice = totalValue / existing.totalUsdcSize;
        existing.lastTradeTime = now;
    } else {
        tradeAggregationBuffer.set(key, {
            traderAddress: trade.traderAddress,
            conditionId: trade.conditionId,
            asset: trade.asset,
            side: trade.side || 'BUY',
            slug: trade.slug,
            eventSlug: trade.eventSlug,
            trades: [trade],
            totalUsdcSize: trade.usdcSize,
            averagePrice: trade.price,
            firstTradeTime: now,
            lastTradeTime: now,
            followingUsers: trade.followingUsers,
        });
    }
};

/**
 * Get ready aggregated trades
 */
const getReadyAggregatedTrades = (): AggregatedTrade[] => {
    const ready: AggregatedTrade[] = [];
    const now = Date.now();
    const windowMs = TRADE_AGGREGATION_WINDOW_SECONDS * 1000;

    for (const [key, agg] of tradeAggregationBuffer.entries()) {
        const timeElapsed = now - agg.firstTradeTime;

        if (timeElapsed >= windowMs) {
            if (agg.totalUsdcSize >= TRADE_AGGREGATION_MIN_TOTAL_USD) {
                ready.push(agg);
            } else {
                // Mark as skipped
                Logger.info(
                    `Trade aggregation for ${agg.traderAddress} on ${agg.slug}: $${agg.totalUsdcSize.toFixed(2)} below minimum - skipping`
                );

                for (const trade of agg.trades) {
                    const UserActivity = getUserActivityModel(trade.traderAddress);
                    UserActivity.updateOne({ _id: trade._id }, { bot: true }).exec();
                }
            }
            tradeAggregationBuffer.delete(key);
        }
    }

    return ready;
};

/**
 * Execute a trade for a specific user
 * Creates a user-specific ClobClient for signing orders
 */
const executeTradeForUser = async (
    trade: UserActivityInterface,
    userWithSettings: UserWithSettings,
    traderAddress: string
) => {
    const { user, settings } = userWithSettings;
    const proxyWallet = user.proxyWallet;

    if (!user.privateKey) {
        Logger.error(`User ${user.email} has no private key configured`);
        return;
    }

    // Decrypt the private key
    let decryptedPrivateKey: string;
    try {
        decryptedPrivateKey = decryptPrivateKey(user.privateKey);
    } catch (error) {
        Logger.error(`Failed to decrypt private key for ${user.email}: ${error}`);
        return;
    }

    Logger.info(`\n👤 Executing for user: ${user.email}`);
    Logger.info(`   Wallet: ${proxyWallet.slice(0, 6)}...${proxyWallet.slice(-4)}`);
    Logger.info(`   Strategy: ${settings.copyStrategy}, Size: ${settings.copySize}%`);

    // Create user-specific ClobClient
    let userClobClient: ClobClient;
    try {
        userClobClient = await createClobClientForUser(decryptedPrivateKey, proxyWallet);
        Logger.info(`   ✓ ClobClient created for user`);
    } catch (error) {
        Logger.error(`Failed to create ClobClient for ${user.email}: ${error}`);
        return;
    }

    // Fetch positions
    const my_positions: UserPositionInterface[] = await fetchData(
        `https://data-api.polymarket.com/positions?user=${proxyWallet}`
    );
    const trader_positions: UserPositionInterface[] = await fetchData(
        `https://data-api.polymarket.com/positions?user=${traderAddress}`
    );
    
    const my_position = my_positions.find(
        (position) => position.conditionId === trade.conditionId
    );
    const trader_position = trader_positions.find(
        (position) => position.conditionId === trade.conditionId
    );

    // Get USDC balance
    const my_balance = await getMyBalance(proxyWallet);
    const trader_balance = trader_positions.reduce((total, pos) => {
        return total + (pos.currentValue || 0);
    }, 0);

    Logger.balance(my_balance, trader_balance, traderAddress);

    // Execute the trade with user-specific ClobClient
    await postOrder(
        userClobClient,
        trade.side === 'BUY' ? 'buy' : 'sell',
        my_position,
        trader_position,
        trade,
        my_balance,
        trader_balance,
        traderAddress
    );
};

/**
 * Execute trades for all following users
 * Each user creates their own ClobClient for signing
 */
const doTrading = async (trades: TradeWithUser[]) => {
    for (const trade of trades) {
        // Mark as being processed
        const UserActivity = getUserActivityModel(trade.traderAddress);
        await UserActivity.updateOne({ _id: trade._id }, { $set: { botExcutedTime: 1 } });

        Logger.trade(trade.traderAddress, trade.side || 'UNKNOWN', {
            asset: trade.asset,
            side: trade.side,
            amount: trade.usdcSize,
            price: trade.price,
            slug: trade.slug,
            eventSlug: trade.eventSlug,
            transactionHash: trade.transactionHash,
        });

        // Execute for each following user (each creates their own ClobClient)
        for (const userWithSettings of trade.followingUsers) {
            try {
                await executeTradeForUser(trade, userWithSettings, trade.traderAddress);
            } catch (error) {
                Logger.error(`Failed to execute for ${userWithSettings.user.email}: ${error}`);
            }
        }

        Logger.separator();
    }
};

/**
 * Execute aggregated trades
 * Each user creates their own ClobClient for signing
 */
const doAggregatedTrading = async (aggregatedTrades: AggregatedTrade[]) => {
    for (const agg of aggregatedTrades) {
        Logger.header(`📊 AGGREGATED TRADE (${agg.trades.length} trades combined)`);
        Logger.info(`Market: ${agg.slug || agg.asset}`);
        Logger.info(`Side: ${agg.side}`);
        Logger.info(`Total volume: $${agg.totalUsdcSize.toFixed(2)}`);

        // Mark all as processed
        for (const trade of agg.trades) {
            const UserActivity = getUserActivityModel(trade.traderAddress);
            await UserActivity.updateOne({ _id: trade._id }, { $set: { botExcutedTime: 1 } });
        }

        // Create synthetic trade
        const syntheticTrade: UserActivityInterface = {
            ...agg.trades[0],
            usdcSize: agg.totalUsdcSize,
            price: agg.averagePrice,
            side: agg.side as 'BUY' | 'SELL',
        };

        // Execute for each following user (each creates their own ClobClient)
        for (const userWithSettings of agg.followingUsers) {
            try {
                await executeTradeForUser(syntheticTrade, userWithSettings, agg.traderAddress);
            } catch (error) {
                Logger.error(`Failed to execute for ${userWithSettings.user.email}: ${error}`);
            }
        }

        Logger.separator();
    }
};

// Track state
let isRunning = false;

/**
 * Stop the trade executor gracefully
 */
export const stopTradeExecutor = async () => {
    isRunning = false;
    await markStopped();
    Logger.info('Trade executor shutdown requested...');
};

/**
 * Get current executor status
 */
export const getExecutorStatus = () => {
    return {
        isRunning,
        traderCount: traderAddresses.length,
        bufferedTrades: tradeAggregationBuffer.size,
    };
};

/**
 * Main trade executor loop (multi-user)
 * Each user creates their own ClobClient when executing trades
 */
const tradeExecutorMultiUser = async () => {
    await initExecutor();
    isRunning = true;

    Logger.success(`Trade executor ready for ${traderAddresses.length} trader(s)`);
    if (TRADE_AGGREGATION_ENABLED) {
        Logger.info(
            `Trade aggregation enabled: ${TRADE_AGGREGATION_WINDOW_SECONDS}s window`
        );
    }

    let lastCheck = Date.now();
    const REFRESH_INTERVAL = 30000; // Refresh trader list every 30s
    const HEARTBEAT_INTERVAL = 10000; // Send heartbeat every 10s
    let lastRefresh = 0;
    let lastHeartbeat = 0;

    while (isRunning) {
        const now = Date.now();

        // Send heartbeat periodically
        if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
            const users = await userManager.getActiveUsers();
            await updateHeartbeat(traderAddresses.length, users.length);
            lastHeartbeat = now;
        }

        // Refresh trader list periodically
        if (now - lastRefresh > REFRESH_INTERVAL) {
            await refreshTraders();
            lastRefresh = now;
        }

        const trades = await readNewTrades();

        if (TRADE_AGGREGATION_ENABLED) {
            if (trades.length > 0) {
                Logger.clearLine();
                Logger.info(`📥 ${trades.length} new trade${trades.length > 1 ? 's' : ''} detected`);
                
                // Increment trade count for each trade
                await incrementTradeCount();

                for (const trade of trades) {
                    if (trade.side === 'BUY' && trade.usdcSize < TRADE_AGGREGATION_MIN_TOTAL_USD) {
                        addToAggregationBuffer(trade);
                    } else {
                        Logger.clearLine();
                        Logger.header(`⚡ IMMEDIATE TRADE (above threshold)`);
                        await doTrading([trade]);
                    }
                }
                lastCheck = now;
            }

            const readyAggregations = getReadyAggregatedTrades();
            if (readyAggregations.length > 0) {
                Logger.clearLine();
                Logger.header(`⚡ ${readyAggregations.length} AGGREGATED TRADE(S) READY`);
                await doAggregatedTrading(readyAggregations);
                lastCheck = now;
            }

            if (trades.length === 0 && readyAggregations.length === 0) {
                if (Date.now() - lastCheck > 300) {
                    const bufferedCount = tradeAggregationBuffer.size;
                    if (bufferedCount > 0) {
                        Logger.waiting(traderAddresses.length, `${bufferedCount} trade group(s) pending`);
                    } else {
                        Logger.waiting(traderAddresses.length);
                    }
                    lastCheck = now;
                }
            }
        } else {
            if (trades.length > 0) {
                Logger.clearLine();
                Logger.header(`⚡ ${trades.length} NEW TRADE${trades.length > 1 ? 'S' : ''} TO COPY`);
                
                // Increment trade count
                await incrementTradeCount();
                
                await doTrading(trades);
                lastCheck = now;
            } else {
                if (Date.now() - lastCheck > 300) {
                    Logger.waiting(traderAddresses.length);
                    lastCheck = now;
                }
            }
        }

        if (!isRunning) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    await markStopped();
    Logger.info('Trade executor stopped');
};

export default tradeExecutorMultiUser;