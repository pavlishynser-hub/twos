/**
 * Register API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/server/services/authService'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.username || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Username, email and password are required' },
        { status: 400 }
      )
    }

    const result = await AuthService.register({
      username: body.username,
      email: body.email,
      password: body.password,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        message: 'Registration successful! Welcome to TWOS.',
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

