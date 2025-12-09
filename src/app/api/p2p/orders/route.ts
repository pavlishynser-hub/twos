/**
 * P2P Orders API
 * 
 * POST /api/p2p/orders - Create new order
 * GET /api/p2p/orders - List orders (with status filter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { P2POrderService } from '@/server/services/p2pOrderService'
import { ChipService } from '@/server/services/chipService'
import { AuthService } from '@/server/services/authService'
import { CreateOrderRequest, CONSTANTS } from '@/server/types'

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
 * POST /api/p2p/orders
 * Create a new P2P order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json() as CreateOrderRequest

    // Validation
    if (!body.chipType || !ChipService.isValidChipType(body.chipType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chip type. Must be SMILE, HEART, FIRE, or RING' },
        { status: 400 }
      )
    }

    if (!body.gamesPlanned || body.gamesPlanned < CONSTANTS.MIN_GAMES_PLANNED) {
      return NextResponse.json(
        { success: false, error: `Minimum ${CONSTANTS.MIN_GAMES_PLANNED} games required` },
        { status: 400 }
      )
    }

    if (body.gamesPlanned > CONSTANTS.MAX_GAMES_PLANNED) {
      return NextResponse.json(
        { success: false, error: `Maximum ${CONSTANTS.MAX_GAMES_PLANNED} games allowed` },
        { status: 400 }
      )
    }

    // Create order
    const result = await P2POrderService.createOrder(
      user.id,
      user.username,
      body
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.order,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/p2p/orders
 * List orders with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // For now, only support OPEN orders
    if (status && status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'Only status=OPEN is supported' },
        { status: 400 }
      )
    }

    const orders = await P2POrderService.getOpenOrders()

    return NextResponse.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
