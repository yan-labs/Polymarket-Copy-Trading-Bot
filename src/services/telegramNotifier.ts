import Logger from '../utils/logger';

/**
 * Telegram Notification Service
 * Sends alerts to users via Telegram Bot API
 */

interface TradeNotification {
  type: 'NEW_TRADE' | 'POSITION_CLOSED' | 'TRADE_COPIED' | 'TRADE_FAILED';
  userId: string;
  traderAddress: string;
  market: string;
  outcome: string;
  amount: string;
  price?: string;
  txHash?: string;
  error?: string;
}

interface DailySummary {
  userId: string;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  volume: string;
  pnl: string;
}

class TelegramNotifier {
  private botToken: string;
  private enabled: boolean;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.enabled = !!this.botToken;
    
    if (!this.enabled) {
      Logger.warning('Telegram notifications disabled: TELEGRAM_BOT_TOKEN not set');
    }
  }

  /**
   * Send a message to a Telegram chat
   */
  private async sendMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.enabled) {
      Logger.info('Telegram disabled, skipping message');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      
      if (!data.ok) {
        Logger.error(`Telegram API error: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      Logger.error(`Failed to send Telegram message: ${error}`);
      return false;
    }
  }

  /**
   * Format trade notification message
   */
  private formatTradeNotification(notification: TradeNotification): string {
    const { type, traderAddress, market, outcome, amount, price, txHash, error } = notification;
    
    const traderShort = `${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`;
    const emojis = {
      NEW_TRADE: '📈',
      POSITION_CLOSED: '💰',
      TRADE_COPIED: '✅',
      TRADE_FAILED: '❌',
    };

    let message = `${emojis[type]} <b>${type.replace(/_/g, ' ')}</b>\n\n`;
    message += `👤 Trader: <code>${traderShort}</code>\n`;
    message += `📊 Market: ${market}\n`;
    message += `🎯 Outcome: ${outcome}\n`;
    message += `💵 Amount: ${amount}\n`;
    
    if (price) {
      message += `💲 Price: ${price}\n`;
    }
    
    if (txHash) {
      const polyUrl = `https://polygonscan.com/tx/${txHash}`;
      message += `🔗 <a href="${polyUrl}">View Transaction</a>\n`;
    }
    
    if (error) {
      message += `\n⚠️ Error: ${error}\n`;
    }

    return message;
  }

  /**
   * Format daily summary message
   */
  private formatDailySummary(summary: DailySummary): string {
    const successRate = summary.totalTrades > 0 
      ? ((summary.successfulTrades / summary.totalTrades) * 100).toFixed(1) 
      : '0';

    let message = `📊 <b>Daily Trading Summary</b>\n\n`;
    message += `📈 Total Trades: ${summary.totalTrades}\n`;
    message += `✅ Successful: ${summary.successfulTrades}\n`;
    message += `❌ Failed: ${summary.failedTrades}\n`;
    message += `📋 Success Rate: ${successRate}%\n`;
    message += `💰 Volume: ${summary.volume}\n`;
    message += `📈 P&L: ${summary.pnl}\n`;

    return message;
  }

  /**
   * Send trade notification to user
   */
  async sendTradeNotification(telegramChatId: string, notification: TradeNotification): Promise<boolean> {
    const message = this.formatTradeNotification(notification);
    return this.sendMessage(telegramChatId, message);
  }

  /**
   * Send daily summary to user
   */
  async sendDailySummary(telegramChatId: string, summary: DailySummary): Promise<boolean> {
    const message = this.formatDailySummary(summary);
    return this.sendMessage(telegramChatId, message);
  }

  /**
   * Send custom alert to user
   */
  async sendAlert(telegramChatId: string, title: string, message: string): Promise<boolean> {
    const formatted = `🚨 <b>${title}</b>\n\n${message}`;
    return this.sendMessage(telegramChatId, formatted);
  }

  /**
   * Test Telegram configuration by sending a test message
   */
  async testConnection(telegramChatId: string): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return { 
        success: false, 
        message: 'Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN environment variable.' 
      };
    }

    const testMessage = `✅ <b>Polymarket Copy Bot Connected!</b>\n\n` +
      `Your Telegram notifications are now active.\n` +
      `You will receive alerts for:\n` +
      `• New trades copied\n` +
      `• Position closures\n` +
      `• Daily summaries (if enabled)`;

    const sent = await this.sendMessage(telegramChatId, testMessage);
    
    return {
      success: sent,
      message: sent 
        ? 'Test message sent successfully!' 
        : 'Failed to send test message. Check your chat ID.',
    };
  }

  /**
   * Get bot info for setup instructions
   */
  static getSetupInstructions(): string {
    return `
<b>Setup Telegram Notifications</b>

1. Open Telegram and search for @BotFather
2. Send /newbot and follow the instructions
3. Copy your bot token
4. Add the token to your .env as TELEGRAM_BOT_TOKEN
5. Start a chat with your bot
6. Send /start to your bot
7. Get your chat ID by visiting:
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   
   Or use @userinfobot to get your chat ID

8. Enter your chat ID in the settings page
    `.trim();
  }
}

// Export singleton instance
export const telegramNotifier = new TelegramNotifier();
export default telegramNotifier;