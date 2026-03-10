import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/db"
import Settings from "@/models/Settings"
import User from "@/models/User"
import {
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Bot status from database
const mongoose = require('mongoose');
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

async function getBotStatus() {
  try {
    const botStatus = await BotStatus.findById('bot_status');
    if (!botStatus) {
      return { isRunning: false, lastHeartbeat: null, traderCount: 0, userCount: 0, tradesToday: 0 };
    }
    const isAlive = botStatus.lastHeartbeat && 
      (new Date().getTime() - new Date(botStatus.lastHeartbeat).getTime()) < 60000;
    return {
      isRunning: isAlive,
      lastHeartbeat: botStatus.lastHeartbeat,
      traderCount: botStatus.traderCount,
      userCount: botStatus.userCount,
      tradesToday: botStatus.tradesToday || 0,
    };
  } catch (error) {
    console.error('Error fetching bot status:', error);
    return { isRunning: false, lastHeartbeat: null, traderCount: 0, userCount: 0, tradesToday: 0 };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Connect to database and fetch real data
  await connectDB()
  const botStatus = await getBotStatus()
  
  // Get actual stats
  const userCount = await User.countDocuments({ proxyWallet: { $exists: true, $ne: '' } })
  const settings = await Settings.find({ followedTraders: { $exists: true, $ne: [] } })
  const uniqueTraders = new Set(
    settings.flatMap(s => s.followedTraders.map((t: string) => t.toLowerCase()))
  ).size

  const stats = [
    {
      title: "Bot Status",
      value: botStatus.isRunning ? "Running" : "Stopped",
      change: botStatus.isRunning ? "Live" : "Offline",
      trend: botStatus.isRunning ? "up" : "down",
      icon: Bot,
    },
    {
      title: "Trades Today",
      value: botStatus.tradesToday.toString(),
      change: botStatus.lastHeartbeat 
        ? `${formatDistanceToNow(new Date(botStatus.lastHeartbeat))} ago`
        : "Never",
      trend: "neutral",
      icon: Activity,
    },
    {
      title: "Traders Following",
      value: uniqueTraders.toString(),
      change: "unique traders",
      trend: "neutral",
      icon: Users,
    },
    {
      title: "Active Users",
      value: userCount.toString(),
      change: "registered",
      trend: "neutral",
      icon: TrendingUp,
    },
  ]

  // Get followed traders for display
  const userId = (session as any).user?.id || (session as any).user?.email
  const userSettings = await Settings.findOne({ userId })
  const followedTraders = userSettings?.followedTraders || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your trading overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {stat.title}
              </span>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-bold ${stat.trend === "up" ? "text-green-600" : stat.trend === "down" ? "text-red-600" : "text-gray-900"}`}>
                {stat.value}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {stat.trend === "up" && (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              )}
              {stat.trend === "down" && (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  stat.trend === "up"
                    ? "text-green-600 text-sm font-medium"
                    : stat.trend === "down"
                    ? "text-red-600 text-sm font-medium"
                    : "text-gray-500 text-sm"
                }
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Status Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Bot Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${botStatus.isRunning ? "bg-green-100" : "bg-gray-100"}`}>
                <Bot className={`h-6 w-6 ${botStatus.isRunning ? "text-green-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className={`text-lg font-semibold ${botStatus.isRunning ? "text-green-600" : "text-gray-600"}`}>
                  {botStatus.isRunning ? "Bot is running" : "Bot is stopped"}
                </p>
                <p className="text-sm text-gray-500">
                  {botStatus.lastHeartbeat 
                    ? `Last heartbeat: ${formatDistanceToNow(new Date(botStatus.lastHeartbeat))} ago`
                    : "No heartbeat received yet"
                  }
                </p>
              </div>
            </div>
            {botStatus.isRunning && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Monitoring {botStatus.traderCount} trader{botStatus.traderCount !== 1 ? 's' : ''} for {botStatus.userCount} user{botStatus.userCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Followed Traders Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Followed Traders</h2>
            <a href="/traders" className="text-sm text-indigo-600 hover:text-indigo-500">Manage</a>
          </div>
          <div className="divide-y divide-gray-100">
            {followedTraders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No traders followed yet</p>
                <a href="/traders" className="text-indigo-600 hover:text-indigo-500 text-sm">
                  Add your first trader →
                </a>
              </div>
            ) : (
              followedTraders.slice(0, 5).map((trader: string, i: number) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-900">
                    {trader.slice(0, 6)}...{trader.slice(-4)}
                  </span>
                  <a 
                    href={`https://polymarket.com/portfolio?address=${trader}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    View on Polymarket →
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold">Ready to start copy trading?</h3>
        <p className="mt-1 text-indigo-100">
          Add traders to follow and configure your copy trading settings.
        </p>
        <div className="mt-4 flex gap-3">
          <a 
            href="/traders"
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
          >
            Add Traders
          </a>
          <a 
            href="/settings"
            className="bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-300 transition-colors"
          >
            Configure Settings
          </a>
        </div>
      </div>
    </div>
  )
}