import mongoose, { Schema, Document } from 'mongoose';

export type CopyStrategy = 'PERCENTAGE' | 'FIXED' | 'ADAPTIVE';

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
  notifications: {
    email: boolean;
    telegram?: string;
    newTrade: boolean;
    positionClosed: boolean;
    dailySummary: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

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
    },
  },
  {
    timestamps: true,
  }
);

export const Settings =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
export default Settings;