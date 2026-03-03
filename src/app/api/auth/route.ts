import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { getR2PublicUrl } from '@/lib/r2-storage'

// GET - Check current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Get user without select to avoid Turbopack cache issues
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Get profile photo URL if exists
    let profilePhotoUrl = null
    if (user.profilePhoto) {
      if (user.profilePhoto.startsWith('http')) {
        profilePhotoUrl = user.profilePhoto
      } else {
        const r2Url = getR2PublicUrl(user.profilePhoto)
        const cacheBuster = user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()
        if (r2Url) {
          profilePhotoUrl = `${r2Url}?v=${cacheBuster}`
        } else {
          profilePhotoUrl = `/api/users/photo?key=${encodeURIComponent(user.profilePhoto)}&v=${cacheBuster}`
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl
      },
      isAuthenticated: true
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password diperlukan' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    // Create log
    await db.log.create({
      data: {
        userId: user.id,
        aktivitas: 'LOGIN',
        deskripsi: `User ${user.name} berhasil login`
      }
    })

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Get profile photo URL if exists
    let profilePhotoUrl = null
    if (user.profilePhoto) {
      if (user.profilePhoto.startsWith('http')) {
        profilePhotoUrl = user.profilePhoto
      } else {
        const r2Url = getR2PublicUrl(user.profilePhoto)
        const cacheBuster = user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()
        if (r2Url) {
          profilePhotoUrl = `${r2Url}?v=${cacheBuster}`
        } else {
          profilePhotoUrl = `/api/users/photo?key=${encodeURIComponent(user.profilePhoto)}&v=${cacheBuster}`
        }
      }
    }

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePhoto: user.profilePhoto,
        profilePhotoUrl
      },
      isAuthenticated: true,
      success: true
    })

    // Set cookie on response
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // True for HTTPS (Vercel)
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    const errM = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: errM, rawError: String(error) }, { status: 500 })
  }
}

// DELETE - Logout
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('userId')
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
