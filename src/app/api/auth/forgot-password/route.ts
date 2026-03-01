import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

// Generate a random token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Token expires in 1 hour
const TOKEN_EXPIRY = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    // Return error if email is not registered
    if (!user) {
      return NextResponse.json({ 
        error: 'Email tidak terdaftar dalam sistem. Pastikan Anda menggunakan email yang sudah terdaftar.',
        notRegistered: true 
      }, { status: 400 })
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY)

    // Store token in database
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    console.log('[Forgot Password] Token stored for user:', user.email)

    // Create reset URL - use the current request origin or fallback
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${origin}/?reset-token=${resetToken}&email=${encodeURIComponent(email)}`

    console.log('[Forgot Password] Reset URL:', resetUrl)

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316, #dc2626); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Password</h1>
            <p style="margin: 0; opacity: 0.9;">E-Katalog SOP BASARNAS</p>
          </div>
          <div class="content">
            <p>Halo <strong>${user.name}</strong>,</p>
            
            <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="btn">Reset Password Saya</a>
            </p>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              atau salin link berikut ke browser Anda:<br>
              <code style="background: #e5e7eb; padding: 8px 12px; border-radius: 4px; font-size: 12px; word-break: break-all; display: inline-block; max-width: 100%;">
                ${resetUrl}
              </code>
            </p>
            
            <div class="warning">
              <strong>⚠️ Penting:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Link ini akan kadaluarsa dalam <strong>1 jam</strong></li>
                <li>Jika Anda tidak meminta reset password, abaikan email ini</li>
                <li>Jangan bagikan link ini kepada siapapun</li>
              </ul>
            </div>
            
            <p>Terima kasih,<br>Tim E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS</p>
          </div>
          <div class="footer">
            Email ini dikirim otomatis oleh Sistem E-Katalog SOP<br>
            Jangan membalas email ini
          </div>
        </div>
      </body>
      </html>
    `

    const emailText = `
Reset Password - E-Katalog SOP BASARNAS

Halo ${user.name},

Kami menerima permintaan untuk mereset password akun Anda.

Klik link berikut untuk membuat password baru:
${resetUrl}

PENTING:
- Link ini akan kadaluarsa dalam 1 jam
- Jika Anda tidak meminta reset password, abaikan email ini
- Jangan bagikan link ini kepada siapapun

Terima kasih,
Tim E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
    `.trim()

    const result = await sendEmail({
      to: { email: user.email, name: user.name },
      subject: '🔐 Reset Password - E-Katalog SOP BASARNAS',
      html: emailHtml,
      text: emailText
    })

    if (!result.success) {
      console.error('[Forgot Password] Failed to send email:', result.error)
      return NextResponse.json({ 
        error: 'Gagal mengirim email. Silakan coba lagi atau hubungi administrator.' 
      }, { status: 500 })
    }

    console.log(`[Forgot Password] Reset email sent successfully to: ${email}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.' 
    })

  } catch (error) {
    console.error('[Forgot Password] Error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan. Silakan coba lagi.' 
    }, { status: 500 })
  }
}
