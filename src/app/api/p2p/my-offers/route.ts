/**
 * My Offers API
 * GET /api/p2p/my-offers - Get current user's offers
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { AuthService } from '@/server/services/authService'

/**
 * Get current user from session
 */
async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return null
  }

  const session = await AuthService.validateSession(token)
  if (!session.valid || !session.user) {
    return null
  }

  return session.user
}

/**
 * GET /api/p2p/my-offers
 * Get all offers where user is creator OR opponent
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log(`[MyOffers] Loading offers for user ${user.id}`)

    // Get offers where user is creator OR opponent
    const offers = await prisma.duelOffer.findMany({
      where: {
        OR: [
          { creatorUserId: user.id },
          { opponentUserId: user.id },
        ],
      },
      include: {
        creator: {
          select: { id: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    console.log(`[MyOffers] Found ${offers.length} offers for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: offers,
    })
  } catch (error) {
    console.error('Error fetching my offers:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
