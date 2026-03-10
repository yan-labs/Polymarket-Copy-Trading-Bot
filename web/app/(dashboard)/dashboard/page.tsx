import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

// Mock data for demo
const stats = [
  {
    title: "Total P&L",
    value: "+$2,450.00",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Active Positions",
    value: "8",
    change: "+2",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "Traders Following",
    value: "5",
    change: "0",
    trend: "neutral",
    icon: Users,
  },
  {
    title: "Win Rate",
    value: "68%",
    change: "+3%",
    trend: "up",
    icon: Activity,
  },
]

const recentTrades = [
  {
    market: "Will Trump win 2024?",
    type: "BUY",
    amount: "$150",
    outcome: "Yes",
    time: "2 min ago",
    trader: "0x1234...5678",
  },
  {
    market: "BTC above $100k by EOY?",
    type: "SELL",
    amount: "$75",
    outcome: "No",
    time: "15 min ago",
    trader: "0xabcd...efgh",
  },
  {
    market: "Fed rate cut in March?",
    type: "BUY",
    amount: "$200",
    outcome: "Yes",
    time: "1 hour ago",
    trader: "0x9876...5432",
  },
]

const topTraders = [
  {
    address: "0x1234...5678",
    winRate: "75%",
    pnl: "+$12,450",
    trades: 156,
  },
  {
    address: "0xabcd...efgh",
    winRate: "72%",
    pnl: "+$8,230",
    trades: 203,
  },
  {
    address: "0x9876...5432",
    winRate: "68%",
    pnl: "+$5,890",
    trades: 89,
  },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

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
              <span className="text-2xl font-bold text-gray-900">
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
              <span className="text-gray-400 text-sm">from last week</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Trades</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTrades.map((trade, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      trade.type === "BUY"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {trade.type === "BUY" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{trade.market}</p>
                    <p className="text-sm text-gray-500">
                      {trade.type} {trade.outcome} • {trade.amount}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{trade.trader}</p>
                  <p className="text-xs text-gray-400">{trade.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Traders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Top Traders</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topTraders.map((trader, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-gray-900">
                    {trader.address}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      trader.pnl.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {trader.pnl}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Win: {trader.winRate}</span>
                  <span>•</span>
                  <span>{trader.trades} trades</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold">Ready to start trading?</h3>
        <p className="mt-1 text-indigo-100">
          Add your first trader to follow and start copy trading automatically.
        </p>
        <button className="mt-4 bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
          Add Trader
        </button>
      </div>
    </div>
  )
}