import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { User } from "@/models/User"
import { Settings } from "@/models/Settings"
import connectDB from "@/lib/mongodb"

// Polymarket API endpoints
const POLYMARKET_POSITIONS_API = "https://data-api.polymarket.com/positions"

// GET /api/positions - Get user's real positions from Polymarket
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get user's proxy wallet
    const user = await User.findById(session.user.id)
    if (!user?.proxyWallet) {
      return NextResponse.json({ 
        error: "No wallet configured",
        message: "Please set up your Polymarket wallet in Settings" 
      }, { status: 400 })
    }

    // Get user's followed traders
    const settings = await Settings.findOne({ userId: session.user.id })
    const followedTraders = settings?.followedTraders || []

    // Fetch positions from Polymarket API
    const positions: any[] = []

    // Fetch user's own positions
    try {
      const userPositions = await fetch(`${POLYMARKET_POSITIONS_API}?user=${user.proxyWallet}`)
      const userData = await userPositions.json()
      
      if (Array.isArray(userData)) {
        positions.push(...userData.map((pos: any) => ({
          id: pos.asset || pos.conditionId,
          market: pos.title || "Unknown Market",
          outcome: pos.outcome || "Unknown",
          shares: pos.size || 0,
          avgPrice: pos.avgPrice || 0,
          currentPrice: pos.curPrice || 0,
          pnl: pos.cashPnl || 0,
          pnlPercent: pos.percentPnl || 0,
          value: pos.currentValue || 0,
          trader: "You",
          conditionId: pos.conditionId,
          asset: pos.asset,
          icon: pos.icon,
          slug: pos.slug,
          openedAt: new Date().toISOString(),
        })))
      }
    } catch (error) {
      console.error("Error fetching user positions:", error)
    }

    // Fetch followed traders' positions
    for (const traderAddress of followedTraders) {
      try {
        const traderPositions = await fetch(`${POLYMARKET_POSITIONS_API}?user=${traderAddress}`)
        const traderData = await traderPositions.json()
        
        if (Array.isArray(traderData)) {
          positions.push(...traderData.map((pos: any) => ({
            id: `${pos.asset || pos.conditionId}-${traderAddress.slice(0, 8)}`,
            market: pos.title || "Unknown Market",
            outcome: pos.outcome || "Unknown",
            shares: pos.size || 0,
            avgPrice: pos.avgPrice || 0,
            currentPrice: pos.curPrice || 0,
            pnl: pos.cashPnl || 0,
            pnlPercent: pos.percentPnl || 0,
            value: pos.currentValue || 0,
            trader: traderAddress,
            conditionId: pos.conditionId,
            asset: pos.asset,
            icon: pos.icon,
            slug: pos.slug,
            openedAt: new Date().toISOString(),
          })))
        }
      } catch (error) {
        console.error(`Error fetching positions for trader ${traderAddress}:`, error)
      }
    }

    // Calculate totals
    const totalValue = positions.reduce((sum, pos) => sum + (pos.value || 0), 0)
    const totalPnl = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0)
    const avgPnlPercent = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + (pos.pnlPercent || 0), 0) / positions.length 
      : 0

    return NextResponse.json({ 
      positions,
      summary: {
        totalPositions: positions.length,
        totalValue,
        totalPnl,
        avgPnlPercent,
        followedTraders: followedTraders.length,
      }
    })
  } catch (error) {
    console.error("Error fetching positions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}