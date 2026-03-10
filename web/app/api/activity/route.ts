import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { User } from "@/models/User"
import { Settings } from "@/models/Settings"
import connectDB from "@/lib/mongodb"

// Polymarket API endpoints
const POLYMARKET_ACTIVITY_API = "https://data-api.polymarket.com/activity"

// GET /api/activity - Get user's real activity from Polymarket
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get("filter") || "all" // all, buys, sells
    const limit = parseInt(searchParams.get("limit") || "50")

    // Fetch activities from Polymarket API
    const activities: any[] = []

    // Fetch user's own activities
    try {
      const userActivityUrl = `${POLYMARKET_ACTIVITY_API}?user=${user.proxyWallet}&type=TRADE`
      const userResponse = await fetch(userActivityUrl)
      const userData = await userResponse.json()
      
      if (Array.isArray(userData)) {
        activities.push(...userData.map((activity: any) => ({
          id: activity.transactionHash || activity._id,
          type: activity.side || "UNKNOWN",
          market: activity.title || "Unknown Market",
          outcome: activity.outcome || "Unknown",
          amount: activity.usdcSize || 0,
          shares: activity.size || 0,
          price: activity.price || 0,
          trader: "You",
          traderAddress: user.proxyWallet,
          timestamp: activity.timestamp ? new Date(activity.timestamp * 1000).toISOString() : new Date().toISOString(),
          status: "completed",
          conditionId: activity.conditionId,
          asset: activity.asset,
          icon: activity.icon,
          slug: activity.slug,
          transactionHash: activity.transactionHash,
        })))
      }
    } catch (error) {
      console.error("Error fetching user activities:", error)
    }

    // Fetch followed traders' activities
    for (const traderAddress of followedTraders) {
      try {
        const traderActivityUrl = `${POLYMARKET_ACTIVITY_API}?user=${traderAddress}&type=TRADE`
        const traderResponse = await fetch(traderActivityUrl)
        const traderData = await traderResponse.json()
        
        if (Array.isArray(traderData)) {
          activities.push(...traderData.map((activity: any) => ({
            id: activity.transactionHash || activity._id,
            type: activity.side || "UNKNOWN",
            market: activity.title || "Unknown Market",
            outcome: activity.outcome || "Unknown",
            amount: activity.usdcSize || 0,
            shares: activity.size || 0,
            price: activity.price || 0,
            trader: activity.name || activity.pseudonym || `${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`,
            traderAddress: traderAddress,
            timestamp: activity.timestamp ? new Date(activity.timestamp * 1000).toISOString() : new Date().toISOString(),
            status: "completed",
            conditionId: activity.conditionId,
            asset: activity.asset,
            icon: activity.icon,
            slug: activity.slug,
            transactionHash: activity.transactionHash,
            profileImage: activity.profileImageOptimized || activity.profileImage,
          })))
        }
      } catch (error) {
        console.error(`Error fetching activities for trader ${traderAddress}:`, error)
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply filter
    let filteredActivities = activities
    if (filter === "buys") {
      filteredActivities = activities.filter(a => a.type === "BUY")
    } else if (filter === "sells") {
      filteredActivities = activities.filter(a => a.type === "SELL")
    }

    // Apply limit
    const limitedActivities = filteredActivities.slice(0, limit)

    // Calculate summary statistics
    const summary = {
      totalTrades: activities.length,
      totalBuys: activities.filter(a => a.type === "BUY").length,
      totalSells: activities.filter(a => a.type === "SELL").length,
      totalVolume: activities.reduce((sum, a) => sum + (a.amount || 0), 0),
    }

    return NextResponse.json({ 
      activities: limitedActivities,
      summary,
    })
  } catch (error) {
    console.error("Error fetching activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}