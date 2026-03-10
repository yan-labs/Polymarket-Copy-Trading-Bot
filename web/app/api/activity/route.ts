import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/activity - Get user's activity log
// This is a placeholder - in production, you'd fetch from MongoDB
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Mock activity data
    // In production, fetch from database where the bot stores trade history
    const mockActivities = [
      {
        id: "1",
        type: "BUY",
        market: "Will Trump win 2024?",
        outcome: "Yes",
        amount: 78.0,
        shares: 150,
        price: 0.52,
        trader: "0x1234567890abcdef1234567890abcdef12345678",
        timestamp: "2 min ago",
        status: "completed",
      },
      {
        id: "2",
        type: "SELL",
        market: "BTC above $100k by EOY?",
        outcome: "No",
        amount: 24.0,
        shares: 75,
        price: 0.32,
        trader: "0xabcdef1234567890abcdef1234567890abcdef12",
        timestamp: "15 min ago",
        status: "completed",
      },
      {
        id: "3",
        type: "BUY",
        market: "Fed rate cut in March?",
        outcome: "Yes",
        amount: 136.0,
        shares: 200,
        price: 0.68,
        trader: "0x9876543210fedcba9876543210fedcba98765432",
        timestamp: "1 hour ago",
        status: "completed",
      },
      {
        id: "4",
        type: "BUY",
        market: "Ethereum above $5k by June?",
        outcome: "Yes",
        amount: 50.0,
        shares: 100,
        price: 0.50,
        trader: "0x1234567890abcdef1234567890abcdef12345678",
        timestamp: "3 hours ago",
        status: "completed",
      },
      {
        id: "5",
        type: "SELL",
        market: "Tesla Q1 earnings beat?",
        outcome: "No",
        amount: 35.0,
        shares: 70,
        price: 0.50,
        trader: "0xabcdef1234567890abcdef1234567890abcdef12",
        timestamp: "5 hours ago",
        status: "completed",
      },
    ]

    return NextResponse.json({ activities: mockActivities })
  } catch (error) {
    console.error("Error fetching activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}