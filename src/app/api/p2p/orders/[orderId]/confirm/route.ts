/**
 * Confirm Order API
 * 
 * POST /api/p2p/orders/[orderId]/confirm - Confirm matched order (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { P2POrderService } from '@/server/services/p2pOrderService'
import { AuthService } from '@/server/services/authService'

interface RouteParams {
  params: Promise<{ orderId: string }>
}

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
 * POST /api/p2p/orders/[orderId]/confirm
 * Owner confirms the duel after opponent joins
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    
    // Confirm order
    const result = await P2POrderService.confirmOrder(orderId, user.id)

    // Get the offer
    const offer = await prisma.duelOffer.findUnique({
      where: { id: orderId },
      include: {
        creator: { select: { id: true, username: true } },
      }
    })

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        message: 'Duel confirmed! Game started.',
      },
    })
  } catch (error) {
    console.error('Error confirming order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
