import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD?.trim()

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set')
      return NextResponse.json(
        { 
          error: 'Admin password not configured. Please set ADMIN_PASSWORD in your .env.local file and restart the server.',
          debug: process.env.NODE_ENV === 'development' ? 'ADMIN_PASSWORD is missing' : undefined
        },
        { status: 500 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const trimmedPassword = password.trim()

    if (trimmedPassword === adminPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Invalid password. Please check your password and try again.' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json(
      { error: 'Invalid request. Please try again.' },
      { status: 400 }
    )
  }
}

