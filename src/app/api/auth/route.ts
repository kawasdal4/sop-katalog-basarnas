import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Check current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }
    
    try {
      const session = JSON.parse(sessionData)
      return NextResponse.json({ 
        user: { 
          id: session.id, 
          email: session.email, 
          name: session.name, 
          role: session.role 
        }, 
        isAuthenticated: true 
      })
    } catch {
      return NextResponse.json({ user: null, isAuthenticated: false })
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}

// POST - Login (supports hardcoded credentials + database users)
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password diperlukan' }, { status: 400 })
    }
    
    // Check hardcoded admin credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    const staffEmail = process.env.STAFF_EMAIL
    const staffPassword = process.env.STAFF_PASSWORD
    
    let user = null
    
    // Check admin credentials
    if (email === adminEmail && password === adminPassword) {
      user = {
        id: 'admin-hardcoded',
        email: adminEmail!,
        name: 'Administrator',
        role: 'ADMIN',
        isHardcoded: true
      }
      console.log('✅ Admin login via hardcoded credentials')
    }
    // Check staff credentials
    else if (email === staffEmail && password === staffPassword) {
      user = {
        id: 'staff-hardcoded',
        email: staffEmail!,
        name: 'Staf BASARNAS',
        role: 'STAF',
        isHardcoded: true
      }
      console.log('✅ Staff login via hardcoded credentials')
    }
    // Fallback to database users
    else {
      const dbUser = await db.user.findUnique({
        where: { email }
      })
      
      if (dbUser && dbUser.password === password) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          isHardcoded: false
        }
        console.log('✅ Login via database')
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }
    
    // Create log (only for non-hardcoded users)
    if (!user.isHardcoded) {
      try {
        await db.log.create({
          data: {
            userId: user.id,
            aktivitas: 'LOGIN',
            deskripsi: `User ${user.name} berhasil login`
          }
        })
      } catch (e) {
        console.log('Could not create log:', e)
      }
    }
    
    // Create response with user data
    const response = NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      isAuthenticated: true,
      success: true
    })
    
    // Set session cookie
    const sessionData = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })
    
    response.cookies.set('session', sessionData, {
      httpOnly: true,
      secure: false,
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
    response.cookies.delete('session')
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
