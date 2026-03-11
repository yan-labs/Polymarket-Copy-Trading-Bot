"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"
import SubscriptionInfo from "@/components/SubscriptionInfo"
import { SubscriptionTier, SubscriptionStatus } from "@/types/subscription"

interface Settings {
  copyStrategy: "PERCENTAGE" | "FIXED" | "ADAPTIVE"
  copySize: number
  maxOrderSizeUSD: number
  minOrderSizeUSD: number
  maxPositionSizeUSD?: number
  maxDailyVolumeUSD?: number
  tradeMultiplier: number
  notifications: {
    email: boolean
    telegram?: string
    newTrade: boolean
    positionClosed: boolean
    dailySummary: boolean
  }
}

interface UserSubscription {
  tier: SubscriptionTier
  status?: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  tradesThisMonth?: number
  tradersCount?: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    copyStrategy: "PERCENTAGE",
    copySize: 10,
    maxOrderSizeUSD: 100,
    minOrderSizeUSD: 1,
    maxPositionSizeUSD: undefined,
    maxDailyVolumeUSD: undefined,
    tradeMultiplier: 1,
    notifications: {
      email: true,
      telegram: "",
      newTrade: true,
      positionClosed: true,
      dailySummary: false,
    },
  })
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: "free",
    status: undefined,
    currentPeriodEnd: undefined,
    cancelAtPeriodEnd: false,
    tradesThisMonth: 0,
    tradersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
    fetchSubscription()
  }, [])

  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  async function fetchSubscription() {
    try {
      const response = await fetch("/api/subscription")
      if (response.ok) {
        const data = await response.json()
        if (data.subscription) {
          setSubscription(data.subscription)
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your settings have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your copy trading preferences.</p>
      </div>

      {/* Subscription Info */}
      <SubscriptionInfo
        tier={subscription.tier}
        status={subscription.status}
        currentPeriodEnd={subscription.currentPeriodEnd}
        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
        tradesThisMonth={subscription.tradesThisMonth}
        tradersCount={subscription.tradersCount}
      />

      {/* Copy Strategy */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Copy Strategy</h2>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="copyStrategy">Strategy Type</Label>
            <Select
              value={settings.copyStrategy}
              onValueChange={(value: "PERCENTAGE" | "FIXED" | "ADAPTIVE") =>
                setSettings({ ...settings, copyStrategy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">
                  Percentage - Copy a % of the trader's position
                </SelectItem>
                <SelectItem value="FIXED">
                  Fixed - Use a fixed USD amount per trade
                </SelectItem>
                <SelectItem value="ADAPTIVE">
                  Adaptive - Adjust based on trader's confidence
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="copySize">
                {settings.copyStrategy === "PERCENTAGE"
                  ? "Copy Percentage (%)"
                  : settings.copyStrategy === "FIXED"
                  ? "Fixed Amount (USD)"
                  : "Base Percentage (%)"}
              </Label>
              <Input
                id="copySize"
                type="number"
                value={settings.copySize}
                onChange={(e) =>
                  setSettings({ ...settings, copySize: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-gray-500">
                {settings.copyStrategy === "PERCENTAGE"
                  ? "Copy 10% means if trader bets $1000, you bet $100"
                  : settings.copyStrategy === "FIXED"
                  ? "Each trade will be exactly this amount"
                  : "Base percentage that adjusts based on trader behavior"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeMultiplier">Trade Multiplier</Label>
              <Input
                id="tradeMultiplier"
                type="number"
                step="0.1"
                value={settings.tradeMultiplier}
                onChange={(e) =>
                  setSettings({ ...settings, tradeMultiplier: parseFloat(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-gray-500">
                Multiply all trades by this factor (e.g., 2x = double all positions)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="minOrderSize">Minimum Order Size (USD)</Label>
            <Input
              id="minOrderSize"
              type="number"
              value={settings.minOrderSizeUSD}
              onChange={(e) =>
                setSettings({ ...settings, minOrderSizeUSD: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500">
              Skip trades smaller than this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxOrderSize">Maximum Order Size (USD)</Label>
            <Input
              id="maxOrderSize"
              type="number"
              value={settings.maxOrderSizeUSD}
              onChange={(e) =>
                setSettings({ ...settings, maxOrderSizeUSD: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500">
              Cap individual trades at this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPositionSize">Maximum Position Size (USD)</Label>
            <Input
              id="maxPositionSize"
              type="number"
              value={settings.maxPositionSizeUSD || ""}
              onChange={(e) =>
                setSettings({ ...settings, maxPositionSizeUSD: parseFloat(e.target.value) || undefined })
              }
              placeholder="No limit"
            />
            <p className="text-xs text-gray-500">
              Maximum total exposure per market
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDailyVolume">Maximum Daily Volume (USD)</Label>
            <Input
              id="maxDailyVolume"
              type="number"
              value={settings.maxDailyVolumeUSD || ""}
              onChange={(e) =>
                setSettings({ ...settings, maxDailyVolumeUSD: parseFloat(e.target.value) || undefined })
              }
              placeholder="No limit"
            />
            <p className="text-xs text-gray-500">
              Stop trading after hitting this daily limit
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive updates via email</p>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">New Trade Alerts</p>
              <p className="text-sm text-gray-500">Get notified when a copied trade executes</p>
            </div>
            <Switch
              checked={settings.notifications.newTrade}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, newTrade: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Position Closed</p>
              <p className="text-sm text-gray-500">Get notified when a position is closed</p>
            </div>
            <Switch
              checked={settings.notifications.positionClosed}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, positionClosed: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Daily Summary</p>
              <p className="text-sm text-gray-500">Receive a daily performance summary</p>
            </div>
            <Switch
              checked={settings.notifications.dailySummary}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, dailySummary: checked },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram Username (optional)</Label>
            <Input
              id="telegram"
              type="text"
              value={settings.notifications.telegram || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, telegram: e.target.value },
                })
              }
              placeholder="@username"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}