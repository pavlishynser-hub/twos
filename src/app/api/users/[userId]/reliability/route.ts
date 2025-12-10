/**
 * User Reliability API
 * 
 * GET /api/users/[userId]/reliability - Get user's reliability metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { ReliabilityService } from '@/server/services/reliabilityService'

interface RouteParams {
  params: { userId: string }
}

/**
 * GET /api/users/[userId]/reliability
 * Get reliability metrics for a user
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const metrics = await ReliabilityService.getMetrics(params.userId)
    const rankInfo = ReliabilityService.getRankInfo(metrics.rank)

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        rankInfo,
        formatted: ReliabilityService.formatReliability(metrics),
      },
    })
  } catch (error) {
    console.error('Error fetching reliability:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


