"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"

interface Position {
  id: string
  market: string
  outcome: "Yes" | "No"
  shares: number
  avgPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  value: number
  trader: string
  openedAt: string
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPositions()
  }, [])

  async function fetchPositions() {
    try {
      const response = await fetch("/api/positions")
      if (response.ok) {
        const data = await response.json()
        setPositions(data.positions || [])
      }
    } catch (error) {
      console.error("Failed to fetch positions:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Positions</h1>
        <p className="text-gray-600">Your active positions from copy trading.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Total Positions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{positions.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Total Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500">Total P&L</p>
          <p className={`text-3xl font-bold mt-2 ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {positions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active positions</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Your copied trades will appear here. Add traders to follow and start copy trading.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Market</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Outcome</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Shares</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Avg Price</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Current</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Value</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">P&L</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Trader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{position.market}</p>
                        <p className="text-xs text-gray-500">{position.openedAt}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          position.outcome === "Yes"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {position.outcome}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-sm">{position.shares.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-sm">¢{(position.avgPrice * 100).toFixed(1)}</td>
                    <td className="p-4 text-right font-mono text-sm">¢{(position.currentPrice * 100).toFixed(1)}</td>
                    <td className="p-4 text-right font-mono text-sm font-medium">${position.value.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-medium ${
                          position.pnl >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                        <span className="text-xs ml-1">
                          ({position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(1)}%)
                        </span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-500">
                        {position.trader.slice(0, 6)}...{position.trader.slice(-4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}