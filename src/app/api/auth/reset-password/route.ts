import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'


export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json()

    // Validate input
    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 400 })
    }

    // Check if token matches and is not expired
    if (user.resetToken !== token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Token sudah kadaluarsa. Silakan minta link reset password baru.' }, { status: 400 })
    }

    // Update user password (in plaintext to match login logic) and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    console.log(`[Reset Password] Password reset successful for: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.'
    })

  } catch (error) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
