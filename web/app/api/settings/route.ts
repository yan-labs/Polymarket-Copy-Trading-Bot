import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Settings } from "@/models/Settings"

// GET /api/settings - Get user's settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    let settings = await Settings.findOne({ userId: session.user.id })

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        userId: session.user.id,
        copyStrategy: "PERCENTAGE",
        copySize: 10,
        maxOrderSizeUSD: 100,
        minOrderSizeUSD: 1,
        tradeMultiplier: 1,
        followedTraders: [],
        notifications: {
          email: true,
          newTrade: true,
          positionClosed: true,
          dailySummary: false,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/settings - Update user's settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    await connectToDatabase()

    const settings = await Settings.findOneAndUpdate(
      { userId: session.user.id },
      { $set: body },
      { new: true, upsert: true }
    )

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}