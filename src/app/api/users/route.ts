import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// Helper to check if user has access to user management
const hasUserManagementAccess = (role: string | null) => {
  return role === 'ADMIN' || role === 'DEVELOPER'
}

// Helper to check if user is developer
const isDeveloper = (role: string | null) => {
  return role === 'DEVELOPER'
}

// GET - Fetch all users (Admin or Developer only)
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[Users API] userId from cookie:', userId ? 'found' : 'not found')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login kembali' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    console.log('[Users API] currentUser:', currentUser ? `found (${currentUser.role})` : 'not found')
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 401 })
    }
    
    if (!hasUserManagementAccess(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Akses ditolak' }, { status: 403 })
    }
    
    // DEVELOPER can see passwords, ADMIN cannot
    const includePassword = isDeveloper(currentUser.role)
    
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: includePassword,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { logs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('[Users API] Found users:', users.length)
    
    return NextResponse.json({ data: users, includePassword })
  } catch (error) {
    console.error('[Users API] Fetch users error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ 
      error: 'Terjadi kesalahan',
      details: process.env.NODE_ENV === 'production' ? undefined : errorMessage 
    }, { status: 500 })
  }
}

// POST - Create new user (Admin or Developer only)
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
    
    if (!hasUserManagementAccess(currentUser.role)) {
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

// PUT - Update user (Admin or Developer only)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (!hasUserManagementAccess(currentUser?.role)) {
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

// DELETE - Delete user (Admin or Developer only)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    
    if (!hasUserManagementAccess(currentUser?.role)) {
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
    
    // Get target user to check role
    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    
    // Only DEVELOPER can delete ADMIN users
    if (targetUser.role === 'ADMIN' && !isDeveloper(currentUser.role)) {
      return NextResponse.json({ error: 'Hanya DEVELOPER yang dapat menghapus user ADMIN' }, { status: 403 })
    }
    
    // Only DEVELOPER can delete other DEVELOPER users
    if (targetUser.role === 'DEVELOPER' && !isDeveloper(currentUser.role)) {
      return NextResponse.json({ error: 'Hanya DEVELOPER yang dapat menghapus user DEVELOPER' }, { status: 403 })
    }
    
    // Check if user has uploaded SOP files
    const sopFilesCount = await db.sopFile.count({ where: { uploadedBy: id } })
    if (sopFilesCount > 0) {
      return NextResponse.json({ 
        error: `Tidak dapat menghapus user karena memiliki ${sopFilesCount} file SOP/IK. Hapus atau transfer file terlebih dahulu.` 
      }, { status: 400 })
    }
    
    // Delete user's logs first (to avoid foreign key constraint)
    await db.log.deleteMany({ where: { userId: id } })
    
    // Then delete the user
    await db.user.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
