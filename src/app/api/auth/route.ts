import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Check current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    })
    
    if (!user) {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }
    
    return NextResponse.json({ user, isAuthenticated: true })
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
    
    // Create response with user data
    const response = NextResponse.json({ 
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      isAuthenticated: true,
      success: true
    })
    
    // Set cookie on response
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
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
