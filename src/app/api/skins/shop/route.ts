/**
 * Skins Shop API
 * GET /api/skins/shop - Get available skins for purchase
 */

import { NextResponse } from 'next/server'
import { ExchangeService } from '@/server/services/exchangeService'

export async function GET() {
  try {
    const skins = await ExchangeService.getShopSkins()

    return NextResponse.json({
      success: true,
      data: skins,
    })
  } catch (error) {
    console.error('Error fetching shop skins:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

