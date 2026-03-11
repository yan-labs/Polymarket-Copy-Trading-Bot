import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"
import { User, TIER_LIMITS } from "@/models/User"

// 7-day free trial duration in milliseconds
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function POST(request: NextRequest) {
  try {
    const { email, password, proxyWallet } = await request.json()

    // Validate input
    if (!email || !password || !proxyWallet) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    if (!proxyWallet.startsWith("0x") || proxyWallet.length !== 42) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Set up 7-day Pro trial
    const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS)

    // Create user with trial
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      proxyWallet: proxyWallet.toLowerCase(),
      // Start with Pro tier during trial
      subscriptionTier: "pro",
      subscriptionStatus: "trialing",
      trialEndsAt,
      trialTier: "pro",
      tradersLimit: TIER_LIMITS.pro.traders, // 20 traders during trial
    })

    return NextResponse.json(
      { 
        message: "User created successfully", 
        userId: user._id,
        trialEndsAt: trialEndsAt.toISOString(),
        trialTier: "pro"
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}