import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Settings } from "@/models/Settings"

// GET /api/traders - Get followed traders
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const settings = await Settings.findOne({ userId: session.user.id })
    const traders = settings?.followedTraders || []

    // Transform into trader objects with mock stats
    // In production, you'd fetch real stats from Polymarket API
    const tradersWithStats = traders.map((address: string, index: number) => ({
      address,
      winRate: Math.floor(Math.random() * 30) + 50, // Mock: 50-80%
      pnl: Math.floor(Math.random() * 10000) - 2000, // Mock: -$2000 to $8000
      trades: Math.floor(Math.random() * 200) + 50, // Mock: 50-250 trades
      addedAt: new Date().toISOString(),
    }))

    return NextResponse.json({ traders: tradersWithStats })
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

    return NextResponse.json({ message: "Trader added successfully" })
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