import mongoose, { Schema, Document } from 'mongoose';

export type CopyStrategy = 'PERCENTAGE' | 'FIXED' | 'ADAPTIVE';

// Trader-specific risk settings
export interface ITraderRiskSettings {
  traderAddress: string;
  enabled: boolean;
  stopLossPercent?: number;   // Auto-sell if position loses X%
  takeProfitPercent?: number;  // Auto-sell if position gains X%
  maxPositionSize?: number;   // Max USD for this trader's positions
  dailyVolumeLimit?: number;  // Max daily volume for this trader
  trailingStop?: {
    enabled: boolean;
    trailPercent: number;     // Trail behind highest price by X%
  };
}

// User-wide risk settings
export interface IRiskSettings {
  autoPause: {
    enabled: boolean;
    maxDrawdownPercent: number;  // Pause bot if total P&L drops X%
    maxDailyLoss: number;       // Pause bot if daily loss exceeds $X
  };
  positionLimits: {
    maxOpenPositions: number;    // Max simultaneous positions
    maxTotalExposure: number;   // Max total USD across all positions
    maxSingleBet: number;       // Max USD for single position
  };
  tradingHours?: {
    enabled: boolean;
    startHour: number;          // 0-23
    endHour: number;            // 0-23
    timezone: string;
  };
}

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  copyStrategy: CopyStrategy;
  copySize: number;
  maxOrderSizeUSD: number;
  minOrderSizeUSD: number;
  maxPositionSizeUSD?: number;
  maxDailyVolumeUSD?: number;
  adaptiveMinPercent?: number;
  adaptiveMaxPercent?: number;
  adaptiveThreshold?: number;
  tradeMultiplier?: number;
  followedTraders: string[];
  traderRiskSettings: ITraderRiskSettings[];
  riskSettings: IRiskSettings;
  notifications: {
    email: boolean;
    telegram?: string;
    newTrade: boolean;
    positionClosed: boolean;
    dailySummary: boolean;
    riskAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const traderRiskSettingsSchema = new Schema({
  traderAddress: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  stopLossPercent: { type: Number },
  takeProfitPercent: { type: Number },
  maxPositionSize: { type: Number },
  dailyVolumeLimit: { type: Number },
  trailingStop: {
    enabled: { type: Boolean, default: false },
    trailPercent: { type: Number, default: 10 },
  },
}, { _id: false });

const riskSettingsSchema = new Schema({
  autoPause: {
    enabled: { type: Boolean, default: false },
    maxDrawdownPercent: { type: Number, default: 20 },
    maxDailyLoss: { type: Number, default: 100 },
  },
  positionLimits: {
    maxOpenPositions: { type: Number, default: 10 },
    maxTotalExposure: { type: Number, default: 1000 },
    maxSingleBet: { type: Number, default: 100 },
  },
  tradingHours: {
    enabled: { type: Boolean, default: false },
    startHour: { type: Number, default: 0 },
    endHour: { type: Number, default: 24 },
    timezone: { type: String, default: 'UTC' },
  },
}, { _id: false });

const settingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    copyStrategy: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'ADAPTIVE'],
      default: 'PERCENTAGE',
    },
    copySize: {
      type: Number,
      default: 10,
    },
    maxOrderSizeUSD: {
      type: Number,
      default: 100,
    },
    minOrderSizeUSD: {
      type: Number,
      default: 1,
    },
    maxPositionSizeUSD: {
      type: Number,
    },
    maxDailyVolumeUSD: {
      type: Number,
    },
    adaptiveMinPercent: {
      type: Number,
    },
    adaptiveMaxPercent: {
      type: Number,
    },
    adaptiveThreshold: {
      type: Number,
    },
    tradeMultiplier: {
      type: Number,
      default: 1,
    },
    followedTraders: {
      type: [String],
      default: [],
    },
    traderRiskSettings: {
      type: [traderRiskSettingsSchema],
      default: [],
    },
    riskSettings: {
      type: riskSettingsSchema,
      default: () => ({
        autoPause: { enabled: false, maxDrawdownPercent: 20, maxDailyLoss: 100 },
        positionLimits: { maxOpenPositions: 10, maxTotalExposure: 1000, maxSingleBet: 100 },
      }),
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      telegram: {
        type: String,
      },
      newTrade: {
        type: Boolean,
        default: true,
      },
      positionClosed: {
        type: Boolean,
        default: true,
      },
      dailySummary: {
        type: Boolean,
        default: false,
      },
      riskAlerts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Settings =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
export default Settings;