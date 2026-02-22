import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch all users (Admin only)
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST - Create new user (Admin only)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan. Silakan login kembali.' }, { status: 401 })
    }
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Anda tidak memiliki akses untuk menambah user' }, { status: 403 })
    }
    
    const body = await request.json()
    const { email, password, name, role } = body
    
    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nama, email, dan password harus diisi' }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
    }
    
    // Validate password length
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 })
    }
    
    // Check if email exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }
    
    const user = await db.user.create({
      data: {
        email,
        password,
        name,
        role: role || 'STAF'
      }
    })
    
    // Create log
    await db.log.create({
      data: {
        userId,
        aktivitas: 'CREATE_USER',
        deskripsi: `Membuat user baru: ${name} (${email})`
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'User berhasil dibuat',
      data: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat membuat user' }, { status: 500 })
  }
}

// PUT - Update user (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id, email, password, name, role } = body
    
    const updateData: Record<string, unknown> = {}
    if (email) updateData.email = email
    if (password) updateData.password = password
    if (name) updateData.name = name
    if (role) updateData.role = role
    
    const user = await db.user.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({ 
      success: true, 
      data: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE - Delete user (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    // Prevent deleting yourself
    if (id === userId) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
    }
    
    await db.user.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
