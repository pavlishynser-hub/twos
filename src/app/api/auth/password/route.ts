/**
 * Change Password API
 * POST /api/auth/password
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/server/services/authService'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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

    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    const result = await AuthService.changePassword(
      session.user!.id,
      body.currentPassword,
      body.newPassword
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Clear auth cookie (user needs to re-login)
    cookieStore.delete('auth_token')

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

