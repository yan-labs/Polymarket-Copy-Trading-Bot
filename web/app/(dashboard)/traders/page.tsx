"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"

interface Trader {
  address: string
  winRate?: number
  pnl?: number
  trades?: number
  addedAt: string
}

export default function TradersPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newAddress, setNewAddress] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchTraders()
  }, [])

  async function fetchTraders() {
    try {
      const response = await fetch("/api/traders")
      if (response.ok) {
        const data = await response.json()
        setTraders(data.traders || [])
      }
    } catch (error) {
      console.error("Failed to fetch traders:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTrader() {
    if (!newAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      })
      return
    }

    if (!newAddress.startsWith("0x") || newAddress.length !== 42) {
      toast({
        title: "Error",
        description: "Please enter a valid Ethereum address (0x...)",
        variant: "destructive",
      })
      return
    }

    setAdding(true)
    try {
      const response = await fetch("/api/traders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress }),
      })

      if (response.ok) {
        toast({
          title: "Trader added",
          description: "You are now following this trader",
        })
        setNewAddress("")
        fetchTraders()
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to add trader")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add trader. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveTrader(address: string) {
    try {
      const response = await fetch(`/api/traders?address=${address}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Trader removed",
          description: "You are no longer following this trader",
        })
        fetchTraders()
      } else {
        throw new Error("Failed to remove trader")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove trader. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Traders</h1>
        <p className="text-gray-600">
          Follow top traders and automatically copy their trades.
        </p>
      </div>

      {/* Add Trader */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add a Trader</h2>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="traderAddress">Wallet Address</Label>
            <Input
              id="traderAddress"
              type="text"
              placeholder="0x..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Find top traders on{" "}
              <a
                href="https://polymarket.com/leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Polymarket Leaderboard
              </a>
            </p>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddTrader} disabled={adding} className="gap-2">
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Trader
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Followed Traders List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Followed Traders</h2>
          <p className="text-sm text-gray-500 mt-1">
            {traders.length} trader{traders.length !== 1 ? "s" : ""} followed
          </p>
        </div>

        {traders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No traders followed</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Add traders from the Polymarket leaderboard to start copy trading.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {traders.map((trader) => (
              <div key={trader.address} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium text-sm">
                      {trader.address.slice(2, 4).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-gray-900">
                      {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      {trader.winRate !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {trader.winRate}% win
                        </span>
                      )}
                      {trader.pnl !== undefined && (
                        <span
                          className={
                            trader.pnl >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {trader.pnl >= 0 ? "+" : ""}${trader.pnl.toLocaleString()}
                        </span>
                      )}
                      {trader.trades !== undefined && (
                        <span>{trader.trades} trades</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://polymarket.com/portfolio?address=${trader.address}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTrader(trader.address)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">Tips for Finding Top Traders</h3>
        <ul className="space-y-2 text-indigo-800">
          <li className="flex items-start gap-2">
            <span className="text-indigo-600">•</span>
            Look for traders with high win rates (&gt;60%) on the Polymarket leaderboard
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600">•</span>
            Check their trade history to understand their strategy
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600">•</span>
            Diversify by following multiple traders with different styles
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600">•</span>
            Start with small position sizes until you're confident in your chosen traders
          </li>
        </ul>
      </div>
    </div>
  )
}