import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Settings } from '@/models/Settings';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * POST /api/telegram/test - Send a test Telegram notification
 * 
 * This endpoint sends a test message to verify Telegram configuration.
 * It uses the Telegram Bot API to send a message directly.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // Check if Telegram bot token is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN environment variable.' 
      }, { status: 400 });
    }

    // Send test message via Telegram API
    const testMessage = `✅ <b>Polymarket Copy Bot Connected!</b>

Your Telegram notifications are now active.

You will receive alerts for:
• New trades copied
• Position closures
• Risk management events
• Daily summaries (if enabled)

<i>Configure your notification preferences in Settings.</i>`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string };

    if (!data.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Telegram API error: ${data.description || 'Unknown error'}` 
      }, { status: 400 });
    }

    // Save the chat ID to user settings
    await connectToDatabase();
    const settings = await Settings.findOne({ userId: session.user.id });
    if (settings) {
      settings.notifications = {
        ...settings.notifications,
        telegram: chatId,
      };
      await settings.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test message sent successfully! Check your Telegram.' 
    });
  } catch (error) {
    console.error('Error sending Telegram test:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test message. Check your chat ID and bot token.' 
    }, { status: 500 });
  }
}

/**
 * GET /api/telegram/instructions - Get setup instructions
 */
export async function GET() {
  const instructions = `
<b>Setup Telegram Notifications</b>

<b>Step 1: Create a Bot</b>
1. Open Telegram and search for @BotFather
2. Send /newbot and follow the instructions
3. Copy your bot token (looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)

<b>Step 2: Configure the Bot</b>
4. Add the bot token to your environment variables as TELEGRAM_BOT_TOKEN
5. Start a chat with your bot in Telegram
6. Send /start to your bot

<b>Step 3: Get Your Chat ID</b>
Option A: Use @userinfobot in Telegram
- Search for @userinfobot and send /start
- It will reply with your chat ID

Option B: Use the API
- Visit: https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates
- Send a message to your bot
- Refresh the URL and look for "chat":{"id":...

<b>Step 4: Test</b>
7. Enter your chat ID in the settings
8. Click "Test Connection" to verify

<i>Note: Group chats have negative chat IDs (e.g., -1001234567890)</i>
  `.trim();

  return NextResponse.json({ instructions });
}