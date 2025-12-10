/**
 * Confirm Order API
 * 
 * POST /api/p2p/orders/[orderId]/confirm - Confirm matched order (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AuthService } from '@/server/services/authService'
import prisma from '@/lib/prisma'
import { DuelOfferStatus } from '@prisma/client'

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
    const { orderId } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log(`[Confirm] User ${user.id} confirming order ${orderId}`)

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

    // Check user is creator
    if (offer.creatorUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only creator can confirm' },
        { status: 403 }
      )
    }

    // Check status
    if (offer.status !== DuelOfferStatus.WAITING_CREATOR_CONFIRM) {
      return NextResponse.json(
        { success: false, error: `Cannot confirm order in status: ${offer.status}` },
        { status: 400 }
      )
    }

    // Update status to MATCHED (ready to play)
    const updatedOffer = await prisma.duelOffer.update({
      where: { id: orderId },
      data: { 
        status: DuelOfferStatus.MATCHED,
      },
      include: {
        creator: { select: { id: true, username: true } },
      }
    })

    console.log(`[Confirm] Order ${orderId} confirmed successfully`)

    return NextResponse.json({
      success: true,
      data: {
        offer: updatedOffer,
        message: 'Duel confirmed! Ready to play.',
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
