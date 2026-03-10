import connectDB, { closeDB } from './config/db';
import tradeExecutorMultiUser, { stopTradeExecutor } from './services/tradeExecutor-multiuser';
import tradeMonitorMultiUser, { stopTradeMonitor } from './services/tradeMonitor-multiuser';
import userManager from './services/userManager';
import Logger from './utils/logger';

// These are now optional - users are loaded from database
const MONGO_URI = process.env.MONGO_URI;
const CLOB_HTTP_URL = process.env.CLOB_HTTP_URL || 'https://clob.polymarket.com/';
const CLOB_WS_URL = process.env.CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws';
const RPC_URL = process.env.RPC_URL;
const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

// Graceful shutdown handler
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
        Logger.warning('Shutdown already in progress, forcing exit...');
        process.exit(1);
    }

    isShuttingDown = true;
    Logger.separator();
    Logger.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
        // Stop services
        stopTradeMonitor();
        stopTradeExecutor();

        // Give services time to finish current operations
        Logger.info('Waiting for services to finish current operations...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Close database connection
        await closeDB();

        Logger.success('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        Logger.error(`Error during shutdown: ${error}`);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    gracefulShutdown('uncaughtException').catch(() => {
        process.exit(1);
    });
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Validate required environment variables for multi-user mode
 */
const validateMultiUserEnv = (): void => {
    const required = ['MONGO_URI', 'RPC_URL'];

    const missing: string[] = [];
    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error('\n❌ Configuration Error: Missing required environment variables\n');
        console.error(`Missing variables: ${missing.join(', ')}\n`);
        console.error('🔧 Quick fix:');
        console.error('   Create a .env file with:\n');
        console.error('   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/polymarket');
        console.error('   RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID\n');
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

export const main = async () => {
    try {
        // Validate environment
        validateMultiUserEnv();

        // Welcome message
        const colors = {
            reset: '\x1b[0m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m',
            green: '\x1b[32m',
        };
        
        console.log(`\n${colors.green}🚀 Poly-CopyBot Multi-User Mode${colors.reset}`);
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        
        // Connect to MongoDB
        await connectDB();
        Logger.success('Connected to MongoDB');

        // Initialize user manager
        await userManager.connectDB(MONGO_URI!);
        
        // Load active users
        const activeUsers = await userManager.getActiveUsers();
        
        if (activeUsers.length === 0) {
            Logger.warning('No active users found.');
            Logger.info('Users need to:');
            Logger.info('  1. Register on the web app');
            Logger.info('  2. Add their proxy wallet');
            Logger.info('  3. Add at least one trader to follow');
            Logger.info('\n  Waiting for users to sign up...\n');
        } else {
            Logger.success(`Found ${activeUsers.length} active user(s)`);
            
            for (const { user, settings } of activeUsers) {
                Logger.info(`  • ${user.email}: ${settings.followedTraders.length} trader(s)`);
            }
        }

        Logger.separator();
        Logger.info('Starting trade monitor (multi-user)...');
        tradeMonitorMultiUser();

        Logger.info('Starting trade executor (multi-user)...');
        // Each user creates their own ClobClient when executing trades
        tradeExecutorMultiUser();

        Logger.success('🚀 Bot started successfully!');
        Logger.info('Press Ctrl+C to stop\n');
    } catch (error) {
        Logger.error(`Fatal error during startup: ${error}`);
        await gracefulShutdown('startup-error');
    }
};

main();