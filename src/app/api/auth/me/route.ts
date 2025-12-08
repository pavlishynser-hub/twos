/**
 * Current User API
 * GET /api/auth/me - Get current user
 * PATCH /api/auth/me - Update profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/server/services/authService'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const result = await AuthService.validateSession(token)

    if (!result.valid) {
      // Clear invalid cookie
      cookieStore.delete('auth_token')
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    // Get user stats
    const stats = await AuthService.getUserStats(result.user!.id)

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        stats,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const session = await AuthService.validateSession(token)
    if (!session.valid) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    const result = await AuthService.updateProfile(session.user!.id, {
      username: body.username,
      telegramId: body.telegramId,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        message: 'Profile updated successfully',
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

