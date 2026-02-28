import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// PUT - Change user's own password
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Silakan login kembali' }, { status: 401 })
    }

    const currentUser = await db.user.findUnique({ where: { id: userId } })

    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Password lama dan baru harus diisi' }, { status: 400 })
    }

    // Validate current password
    if (currentUser.password !== currentPassword) {
      return NextResponse.json({ error: 'Password lama tidak sesuai' }, { status: 400 })
    }

    // Validate new password length
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password baru minimal 4 karakter' }, { status: 400 })
    }

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { password: newPassword }
    })

    // Create log
    await db.log.create({
      data: {
        userId,
        aktivitas: 'CHANGE_PASSWORD',
        deskripsi: 'Mengubah password akun'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengubah password' }, { status: 500 })
  }
}
