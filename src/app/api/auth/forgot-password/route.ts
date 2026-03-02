import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, generateForgotPasswordEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 })
    }

    // Check if user exists
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })

    if (!user) {
      // For security, don't reveal if user exists or not
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, instruksi reset password akan dikirim.'
      })
    }

    // In a real app, generate a token and store in DB with expiry
    // For this implementation, we'll use a simple URL with email (should be tokenized in production)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://e-katalog-sop.cloud'
    const resetLink = `${appUrl}/auth/reset-password?email=${encodeURIComponent(email)}&t=${Date.now()}`

    // Send email
    const html = generateForgotPasswordEmail({
      name: user.name || 'User',
      resetLink
    })

    await sendEmail({
      to: email,
      subject: '[E-Katalog SOP] Permintaan Reset Password',
      html
    })

    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, instruksi reset password akan dikirim.'
    })

  } catch (error) {
    console.error('❌ [Forgot Password API] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
