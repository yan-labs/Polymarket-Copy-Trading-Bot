"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowUpRight, ArrowDownRight, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Activity {
  id: string
  type: "BUY" | "SELL"
  market: string
  outcome: "Yes" | "No"
  amount: number
  shares: number
  price: number
  trader: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "BUY" | "SELL">("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchActivities()
  }, [])

  async function fetchActivities() {
    try {
      const response = await fetch("/api/activity")
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(
    (a) => filter === "all" || a.type === filter
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-600">Your copy trading history and logs.</p>
        </div>
        <Button variant="outline" onClick={fetchActivities} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "BUY" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("BUY")}
          className={filter === "BUY" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          Buys
        </Button>
        <Button
          variant={filter === "SELL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("SELL")}
          className={filter === "SELL" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Sells
        </Button>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Your trade history will appear here once you start copy trading.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-4">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    activity.type === "BUY"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {activity.type === "BUY" ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        activity.type === "BUY"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">{activity.timestamp}</span>
                  </div>
                  <p className="font-medium text-gray-900 truncate mt-1">
                    {activity.market}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>
                      {activity.outcome} @ ¢{(activity.price * 100).toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{activity.shares.toFixed(2)} shares</span>
                    <span>•</span>
                    <span className="font-medium text-gray-900">${activity.amount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-gray-500">
                    {activity.trader.slice(0, 6)}...{activity.trader.slice(-4)}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                      activity.status === "completed"
                        ? "bg-gray-100 text-gray-600"
                        : activity.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Buys</p>
            <p className="text-2xl font-bold text-green-600">
              {activities.filter((a) => a.type === "BUY").length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Sells</p>
            <p className="text-2xl font-bold text-red-600">
              {activities.filter((a) => a.type === "SELL").length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900">
              ${activities.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}