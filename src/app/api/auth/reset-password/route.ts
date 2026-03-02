import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, generatePasswordChangedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password diperlukan' }, { status: 400 })
    }

    // Check if user exists
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { password } // In real app, hash this with bcrypt/argon2
    })

    // Send confirmation email
    const html = generatePasswordChangedEmail({
      name: user.name || 'User'
    })

    await sendEmail({
      to: email,
      subject: '[E-Katalog SOP] Password Berhasil Diubah',
      html
    })

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui'
    })

  } catch (error) {
    console.error('❌ [Reset Password API] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
