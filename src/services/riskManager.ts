import Logger from '../utils/logger';

/**
 * Risk Management Service
 * Handles stop-loss per trader, auto-pause on drawdown, and position limits
 */

// Risk settings per trader
interface TraderRiskSettings {
  traderAddress: string;
  enabled: boolean;
  stopLossPercent?: number;  // Auto-sell if position loses X%
  takeProfitPercent?: number; // Auto-sell if position gains X%
  maxPositionSize?: number;  // Max USD value for this trader's positions
  dailyVolumeLimit?: number;  // Max daily volume for this trader
  trailingStop?: {
    enabled: boolean;
    trailPercent: number;     // Trail behind highest price by X%
  };
}

// User-wide risk settings
interface UserRiskSettings {
  autoPause: {
    enabled: boolean;
    maxDrawdownPercent: number;  // Pause bot if total P&L drops X%
    maxDailyLoss: number;        // Pause bot if daily loss exceeds $X
  };
  positionLimits: {
    maxOpenPositions: number;     // Max simultaneous positions
    maxTotalExposure: number;     // Max total USD across all positions
    maxSingleBet: number;         // Max USD for single position
  };
  tradingHours?: {
    enabled: boolean;
    startHour: number;            // 0-23
    endHour: number;              // 0-23
    timezone: string;
  };
}

// Position tracking for risk calculations
interface Position {
  id: string;
  userId: string;
  traderAddress: string;
  market: string;
  outcome: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  entryValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  highestPrice: number;  // For trailing stop
  openedAt: Date;
}

// Risk event for logging
interface RiskEvent {
  userId: string;
  type: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'AUTO_PAUSE' | 'LIMIT_REACHED';
  traderAddress?: string;
  market?: string;
  details: string;
  action: string;
  timestamp: Date;
}

class RiskManager {
  // In-memory position tracking (should be persisted to DB in production)
  private positions: Map<string, Position> = new Map();
  
  // User risk settings cache
  private userRiskSettings: Map<string, UserRiskSettings> = new Map();
  
  // Trader-specific risk settings
  private traderRiskSettings: Map<string, TraderRiskSettings> = new Map();

  // Daily P&L tracking
  private dailyPnL: Map<string, { date: string; pnl: number }> = new Map();

  constructor() {
    Logger.info('Risk Manager initialized');
  }

  /**
   * Set user-wide risk settings
   */
  setUserRiskSettings(userId: string, settings: UserRiskSettings): void {
    this.userRiskSettings.set(userId, settings);
    Logger.info(`Updated risk settings for user ${userId}`);
  }

  /**
   * Set trader-specific risk settings
   */
  setTraderRiskSettings(userId: string, settings: TraderRiskSettings): void {
    const key = `${userId}:${settings.traderAddress}`;
    this.traderRiskSettings.set(key, settings);
    Logger.info(`Updated risk settings for trader ${settings.traderAddress}`);
  }

  /**
   * Add or update a position
   */
  updatePosition(position: Position): void {
    this.positions.set(position.id, position);
    
    // Update highest price for trailing stop
    const existing = this.positions.get(position.id);
    if (existing && position.currentPrice > existing.highestPrice) {
      position.highestPrice = position.currentPrice;
    }
  }

  /**
   * Remove a position
   */
  removePosition(positionId: string): void {
    this.positions.delete(positionId);
  }

  /**
   * Check if a new trade should be allowed
   */
  shouldAllowTrade(userId: string, traderAddress: string, proposedSize: number): {
    allowed: boolean;
    reason?: string;
  } {
    const userSettings = this.userRiskSettings.get(userId);
    
    // Check if user is auto-paused
    if (userSettings?.autoPause.enabled) {
      const dailyLoss = this.getDailyPnL(userId);
      if (dailyLoss < -userSettings.autoPause.maxDailyLoss) {
        return {
          allowed: false,
          reason: `Auto-paused: Daily loss limit ($${userSettings.autoPause.maxDailyLoss}) reached`,
        };
      }
    }

    // Check position limits
    if (userSettings?.positionLimits) {
      const userPositions = this.getUserPositions(userId);
      
      // Max open positions
      if (userPositions.length >= userSettings.positionLimits.maxOpenPositions) {
        return {
          allowed: false,
          reason: `Max open positions (${userSettings.positionLimits.maxOpenPositions}) reached`,
        };
      }

      // Max single bet
      if (proposedSize > userSettings.positionLimits.maxSingleBet) {
        return {
          allowed: false,
          reason: `Bet size ($${proposedSize}) exceeds max ($${userSettings.positionLimits.maxSingleBet})`,
        };
      }

      // Max total exposure
      const totalExposure = userPositions.reduce((sum, p) => sum + p.currentValue, 0);
      if (totalExposure + proposedSize > userSettings.positionLimits.maxTotalExposure) {
        return {
          allowed: false,
          reason: `Total exposure would exceed max ($${userSettings.positionLimits.maxTotalExposure})`,
        };
      }
    }

    // Check trader-specific limits
    const traderSettings = this.traderRiskSettings.get(`${userId}:${traderAddress}`);
    if (traderSettings) {
      if (!traderSettings.enabled) {
        return {
          allowed: false,
          reason: `Trading disabled for this trader`,
        };
      }

      if (traderSettings.maxPositionSize && proposedSize > traderSettings.maxPositionSize) {
        return {
          allowed: false,
          reason: `Bet size exceeds trader limit ($${traderSettings.maxPositionSize})`,
        };
      }
    }

    // Check trading hours
    if (userSettings?.tradingHours?.enabled) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < userSettings.tradingHours.startHour || hour >= userSettings.tradingHours.endHour) {
        return {
          allowed: false,
          reason: `Outside trading hours (${userSettings.tradingHours.startHour}:00 - ${userSettings.tradingHours.endHour}:00)`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check all positions for stop-loss/take-profit triggers
   */
  checkPositionTriggers(userId: string): RiskEvent[] {
    const events: RiskEvent[] = [];
    const userPositions = this.getUserPositions(userId);

    for (const position of userPositions) {
      const traderSettings = this.traderRiskSettings.get(`${userId}:${position.traderAddress}`);
      
      if (!traderSettings) continue;

      // Check stop-loss
      if (traderSettings.stopLossPercent && position.pnlPercent <= -traderSettings.stopLossPercent) {
        events.push({
          userId,
          type: 'STOP_LOSS',
          traderAddress: position.traderAddress,
          market: position.market,
          details: `Position down ${Math.abs(position.pnlPercent).toFixed(1)}% (stop-loss at ${traderSettings.stopLossPercent}%)`,
          action: 'SELL_POSITION',
          timestamp: new Date(),
        });
      }

      // Check take-profit
      if (traderSettings.takeProfitPercent && position.pnlPercent >= traderSettings.takeProfitPercent) {
        events.push({
          userId,
          type: 'TAKE_PROFIT',
          traderAddress: position.traderAddress,
          market: position.market,
          details: `Position up ${position.pnlPercent.toFixed(1)}% (take-profit at ${traderSettings.takeProfitPercent}%)`,
          action: 'SELL_POSITION',
          timestamp: new Date(),
        });
      }

      // Check trailing stop
      if (traderSettings.trailingStop?.enabled) {
        const trailPercent = traderSettings.trailingStop.trailPercent;
        const priceDrop = ((position.highestPrice - position.currentPrice) / position.highestPrice) * 100;
        
        if (position.pnlPercent > 0 && priceDrop >= trailPercent) {
          events.push({
            userId,
            type: 'TRAILING_STOP',
            traderAddress: position.traderAddress,
            market: position.market,
            details: `Price dropped ${priceDrop.toFixed(1)}% from high (trailing stop at ${trailPercent}%)`,
            action: 'SELL_POSITION',
            timestamp: new Date(),
          });
        }
      }
    }

    return events;
  }

  /**
   * Update daily P&L
   */
  updateDailyPnL(userId: string, pnlChange: number): void {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.dailyPnL.get(userId);
    
    if (existing?.date === today) {
      existing.pnl += pnlChange;
    } else {
      this.dailyPnL.set(userId, { date: today, pnl: pnlChange });
    }
  }

  /**
   * Get daily P&L
   */
  getDailyPnL(userId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const data = this.dailyPnL.get(userId);
    return data?.date === today ? data.pnl : 0;
  }

  /**
   * Get all positions for a user
   */
  getUserPositions(userId: string): Position[] {
    return Array.from(this.positions.values()).filter(p => p.userId === userId);
  }

  /**
   * Get position by ID
   */
  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Get risk settings for a user
   */
  getUserRiskSettings(userId: string): UserRiskSettings | undefined {
    return this.userRiskSettings.get(userId);
  }

  /**
   * Get risk settings for a trader
   */
  getTraderRiskSettings(userId: string, traderAddress: string): TraderRiskSettings | undefined {
    return this.traderRiskSettings.get(`${userId}:${traderAddress}`);
  }

  /**
   * Calculate total exposure for a user
   */
  getTotalExposure(userId: string): number {
    return this.getUserPositions(userId).reduce((sum, p) => sum + p.currentValue, 0);
  }

  /**
   * Get risk summary for a user
   */
  getRiskSummary(userId: string): {
    totalPositions: number;
    totalExposure: number;
    dailyPnL: number;
    isAutoPaused: boolean;
    autoPauseReason?: string;
  } {
    const positions = this.getUserPositions(userId);
    const settings = this.userRiskSettings.get(userId);
    const dailyPnL = this.getDailyPnL(userId);
    
    let isAutoPaused = false;
    let autoPauseReason: string | undefined;

    if (settings?.autoPause.enabled) {
      if (dailyPnL < -settings.autoPause.maxDailyLoss) {
        isAutoPaused = true;
        autoPauseReason = `Daily loss limit reached ($${settings.autoPause.maxDailyLoss})`;
      }
    }

    return {
      totalPositions: positions.length,
      totalExposure: positions.reduce((sum, p) => sum + p.currentValue, 0),
      dailyPnL,
      isAutoPaused,
      autoPauseReason,
    };
  }
}

// Export singleton instance
export const riskManager = new RiskManager();
export type { TraderRiskSettings, UserRiskSettings, Position, RiskEvent };
export default riskManager;