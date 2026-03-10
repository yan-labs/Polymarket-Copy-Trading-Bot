import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Settings } from "@/models/Settings"

// Polymarket API endpoints
const POLYMARKET_POSITIONS_API = "https://data-api.polymarket.com/positions"
const POLYMARKET_ACTIVITY_API = "https://data-api.polymarket.com/activity"

// Helper function to fetch trader stats from Polymarket
async function getTraderStats(address: string) {
  try {
    // Fetch positions
    const positionsUrl = `${POLYMARKET_POSITIONS_API}?user=${address}`
    const positionsResponse = await fetch(positionsUrl)
    const positions = await positionsResponse.json()

    // Fetch activities
    const activityUrl = `${POLYMARKET_ACTIVITY_API}?user=${address}&type=TRADE`
    const activityResponse = await fetch(activityUrl)
    const activities = await activityResponse.json()

    // Calculate stats
    let totalPnl = 0
    let winningPositions = 0
    let totalPositions = 0
    let totalTrades = Array.isArray(activities) ? activities.length : 0
    let totalVolume = 0

    if (Array.isArray(positions)) {
      totalPositions = positions.length
      positions.forEach((pos: any) => {
        totalPnl += pos.cashPnl || 0
        if ((pos.percentPnl || 0) > 0) winningPositions++
      })
    }

    if (Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        totalVolume += activity.usdcSize || 0
      })
    }

    const winRate = totalPositions > 0 ? (winningPositions / totalPositions) * 100 : 0

    // Get trader profile info (if available)
    let name = `${address.slice(0, 6)}...${address.slice(-4)}`
    let profileImage = null
    let bio = null

    if (Array.isArray(activities) && activities.length > 0) {
      const latestActivity = activities[0]
      name = latestActivity.name || latestActivity.pseudonym || name
      profileImage = latestActivity.profileImageOptimized || latestActivity.profileImage
      bio = latestActivity.bio
    }

    return {
      address,
      name,
      profileImage,
      bio,
      winRate: Math.round(winRate * 10) / 10,
      pnl: Math.round(totalPnl * 100) / 100,
      trades: totalTrades,
      positions: totalPositions,
      volume: Math.round(totalVolume * 100) / 100,
      addedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Error fetching stats for trader ${address}:`, error)
    return {
      address,
      name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      winRate: 0,
      pnl: 0,
      trades: 0,
      positions: 0,
      volume: 0,
      error: "Failed to fetch trader data",
      addedAt: new Date().toISOString(),
    }
  }
}

// GET /api/traders - Get followed traders with real stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const settings = await Settings.findOne({ userId: session.user.id })
    const traders = settings?.followedTraders || []

    // Fetch real stats for each trader
    const tradersWithStats = await Promise.all(
      traders.map((address: string) => getTraderStats(address))
    )

    // Calculate overall summary
    const summary = {
      totalTraders: tradersWithStats.length,
      totalPnl: tradersWithStats.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0),
      avgWinRate: tradersWithStats.length > 0 
        ? tradersWithStats.reduce((sum: number, t: any) => sum + (t.winRate || 0), 0) / tradersWithStats.length 
        : 0,
      totalTrades: tradersWithStats.reduce((sum: number, t: any) => sum + (t.trades || 0), 0),
      totalVolume: tradersWithStats.reduce((sum: number, t: any) => sum + (t.volume || 0), 0),
    }

    return NextResponse.json({ 
      traders: tradersWithStats,
      summary,
    })
  } catch (error) {
    console.error("Error fetching traders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/traders - Add a trader to follow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { address } = await request.json()

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }

    await connectToDatabase()

    const normalizedAddress = address.toLowerCase()

    // Check if already following
    const settings = await Settings.findOne({ userId: session.user.id })
    const existingTraders = settings?.followedTraders || []

    if (existingTraders.map((a: string) => a.toLowerCase()).includes(normalizedAddress)) {
      return NextResponse.json({ error: "Already following this trader" }, { status: 400 })
    }

    // Verify trader exists on Polymarket
    try {
      const verifyUrl = `${POLYMARKET_ACTIVITY_API}?user=${normalizedAddress}&type=TRADE`
      const verifyResponse = await fetch(verifyUrl)
      const verifyData = await verifyResponse.json()
      
      if (!Array.isArray(verifyData) || verifyData.length === 0) {
        return NextResponse.json({ 
          error: "Trader not found or has no trading history" 
        }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ 
        error: "Failed to verify trader address" 
      }, { status: 400 })
    }

    // Add trader
    await Settings.findOneAndUpdate(
      { userId: session.user.id },
      { 
        $push: { followedTraders: normalizedAddress },
        $setOnInsert: {
          copyStrategy: "PERCENTAGE",
          copySize: 10,
          maxOrderSizeUSD: 100,
          minOrderSizeUSD: 1,
          tradeMultiplier: 1,
          notifications: {
            email: true,
            newTrade: true,
            positionClosed: true,
            dailySummary: false,
          },
        }
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ 
      message: "Trader added successfully",
      address: normalizedAddress,
    })
  } catch (error) {
    console.error("Error adding trader:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/traders - Remove a trader
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    await connectToDatabase()

    await Settings.findOneAndUpdate(
      { userId: session.user.id },
      { $pull: { followedTraders: address.toLowerCase() } }
    )

    return NextResponse.json({ message: "Trader removed successfully" })
  } catch (error) {
    console.error("Error removing trader:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}