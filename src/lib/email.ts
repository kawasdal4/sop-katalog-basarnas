/**
 * Email Service (Resend Implementation)
 * 
 * Handles email notifications for the SOP Katalog system
 * Using Resend SDK for better delivery and reliability on Vercel
 */

import { Resend } from 'resend'
import { db } from '@/lib/db'

// Resend Configuration
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifikasi@e-katalog-sop.cloud'
const EMAIL_FROM_NAME = 'SOP Katalog'
const APP_URL = 'https://e-katalog-sop.cloud'

// Email types
export type EmailTemplateType =
  | 'SOP_PUBLISHED'      // New SOP published - notify all users
  | 'SOP_SUBMITTED'      // Public submission - notify admins
  | 'FILE_UPDATED'       // SOP updated via Edit & Sync - notify relevant users
  | 'SOP_REJECTED'       // Submission rejected - notify submitter
  | 'SOP_APPROVED'       // Submission approved - notify submitter
  | 'FORGOT_PASSWORD'    // Password reset request
  | 'PASSWORD_CHANGED'   // Password changed notification

export interface EmailRecipient {
  email: string
  name?: string | null
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const from = options.from || `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`

    const { data, error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    })

    if (error) {
      console.error('❌ [Resend] Error sending email:', error)
      return { success: false, error }
    }

    console.log(`✅ [Resend] Email sent successfully: ${data?.id}`)
    return { success: true, data }
  } catch (error) {
    console.error('❌ [Resend] Critical error:', error)
    return { success: false, error }
  }
}

/**
 * Get all active users for notifications
 */
export async function getAllActiveUsers(): Promise<EmailRecipient[]> {
  try {
    return await db.user.findMany({
      where: { email: { not: '' } },
      select: { email: true, name: true }
    })
  } catch (error) {
    console.error('❌ [Email] Failed to get users:', error)
    return []
  }
}

/**
 * Get all admin users for notifications
 */
export async function getAdminUsers(): Promise<EmailRecipient[]> {
  try {
    return await db.user.findMany({
      where: { role: { in: ['ADMIN', 'DEVELOPER'] } },
      select: { email: true, name: true }
    })
  } catch (error) {
    console.error('❌ [Email] Failed to get admins:', error)
    return []
  }
}

// ============================================================================
// EMAIL TEMPLATES (Modern, Professional, Responsive)
// ============================================================================

const BASE_STYLE = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
  .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
  .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
  .content { padding: 40px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
  .badge-blue { background-color: #dbeafe; color: #1e40af; }
  .badge-orange { background-color: #ffedd5; color: #9a3412; }
  .badge-green { background-color: #dcfce7; color: #166534; }
  .badge-red { background-color: #fee2e2; color: #991b1b; }
  h2 { color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; }
  p { margin-bottom: 24px; color: #475569; }
  .details-box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 32px; }
  .detail-row { display: flex; margin-bottom: 8px; font-size: 14px; }
  .detail-label { color: #64748b; width: 120px; flex-shrink: 0; font-weight: 500; }
  .detail-value { color: #1e293b; font-weight: 600; }
  .btn { display: inline-block; background-color: #f97316; color: #ffffff !important; font-weight: 700; padding: 12px 32px; border-radius: 8px; text-decoration: none; transition: background-color 0.2s; }
  .footer { padding: 32px; text-align: center; border-top: 1px solid #f1f5f9; }
  .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
`

function wrapTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${BASE_STYLE}</style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          ${content}
          <div class="footer">
            <p>© ${new Date().getFullYear()} E-Katalog SOP - Direktorat Kesiapsiagaan</p>
            <p style="margin-top: 8px;">Badan Nasional Pencarian dan Pertolongan (BASARNAS)</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * 1. Publish SOP Baru
 */
export function generateSopPublishedEmail(data: {
  nomorSop: string
  judul: string
  jenis: string
  kategori: string
}) {
  const content = `
    <div class="header"><h1>SOP TERBIT</h1></div>
    <div class="content">
      <div class="badge badge-orange">Publikasi Baru</div>
      <h2>Dokumen SOP Baru Telah Terbit</h2>
      <p>Halo, ada dokumen SOP baru yang telah dipublikasikan dan dapat Anda akses sekarang melalui E-Katalog SOP.</p>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Nomor</div><div class="detail-value">${data.nomorSop}</div></div>
        <div class="detail-row"><div class="detail-label">Judul</div><div class="detail-value">${data.judul}</div></div>
        <div class="detail-row"><div class="detail-label">Jenis</div><div class="detail-value">${data.jenis}</div></div>
        <div class="detail-row"><div class="detail-label">Kategori</div><div class="detail-value">${data.kategori}</div></div>
      </div>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn">Lihat Dokumen</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 2. Pengajuan SOP Baru (Admin Notification)
 */
export function generateSopSubmittedEmail(data: {
  nomorSop: string
  judul: string
  submitter: string
}) {
  const content = `
    <div class="header" style="background: #1e293b;"><h1>PENGAJUAN BARU</h1></div>
    <div class="content">
      <div class="badge badge-blue">Perlu Verifikasi</div>
      <h2>Ada Pengajuan SOP Baru</h2>
      <p>Seseorang telah mengajukan dokumen baru melalui sistem publik. Silakan periksa detail pengajuan di bawah ini:</p>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Nomor</div><div class="detail-value">${data.nomorSop}</div></div>
        <div class="detail-row"><div class="detail-label">Judul</div><div class="detail-value">${data.judul}</div></div>
        <div class="detail-row"><div class="detail-label">Pengaju</div><div class="detail-value">${data.submitter}</div></div>
      </div>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn">Buka Dashboard Admin</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 3. Update File (Edit & Sync)
 */
export function generateFileUpdatedEmail(data: {
  nomorSop: string
  judul: string
  updatedBy: string
}) {
  const content = `
    <div class="header"><h1>UPDATE DOKUMEN</h1></div>
    <div class="content">
      <div class="badge badge-blue">Revisi</div>
      <h2>File SOP Telah Diperbarui</h2>
      <p>File dokumen berikut telah diperbarui melalui fitur Edit & Sync.</p>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Nomor</div><div class="detail-value">${data.nomorSop}</div></div>
        <div class="detail-row"><div class="detail-label">Judul</div><div class="detail-value">${data.judul}</div></div>
        <div class="detail-row"><div class="detail-label">Diperbarui</div><div class="detail-value">${data.updatedBy}</div></div>
      </div>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn">Lihat Perubahan</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 4. Pengajuan Ditolak
 */
export function generateSopRejectedEmail(data: {
  nomorSop: string
  judul: string
  reason: string
}) {
  const content = `
    <div class="header" style="background: #ef4444;"><h1>PENGAJUAN DITOLAK</h1></div>
    <div class="content">
      <div class="badge badge-red">Ditolak</div>
      <h2>Status Pengajuan SOP</h2>
      <p>Mohon maaf, pengajuan dokumen Anda belum dapat disetujui karena alasan berikut:</p>
      <div class="details-box" style="border-left: 4px solid #ef4444;">
        <p style="margin: 0; font-weight: 600; color: #991b1b;">"${data.reason}"</p>
      </div>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Nomor</div><div class="detail-value">${data.nomorSop}</div></div>
        <div class="detail-row"><div class="detail-label">Judul</div><div class="detail-value">${data.judul}</div></div>
      </div>
      <p>Anda dapat mengunggah kembali dokumen setelah melakukan perbaikan.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn" style="background-color: #334155;">Buka Dashboard</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 5. Pengajuan Disetujui
 */
export function generateSopApprovedEmail(data: {
  nomorSop: string
  judul: string
}) {
  const content = `
    <div class="header" style="background: #10b981;"><h1>PENGAJUAN DISETUJUI</h1></div>
    <div class="content">
      <div class="badge badge-green">Disetujui</div>
      <h2>Kabar Baik! Pengajuan SOP Anda Diterima</h2>
      <p>Selamat, pengajuan dokumen Anda telah diverifikasi oleh tim admin dan kini telah terbit di sistem.</p>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Nomor</div><div class="detail-value">${data.nomorSop}</div></div>
        <div class="detail-row"><div class="detail-label">Judul</div><div class="detail-value">${data.judul}</div></div>
      </div>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn" style="background-color: #10b981;">Buka E-Katalog SOP</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 6. Forgot Password
 */
export function generateForgotPasswordEmail(data: {
  name: string
  resetLink: string
}) {
  const content = `
    <div class="header" style="background: #6366f1;"><h1>RESET PASSWORD</h1></div>
    <div class="content">
      <h2>Permintaan Reset Password</h2>
      <p>Halo ${data.name}, Kami menerima permintaan untuk mereset password akun Anda di E-Katalog SOP.</p>
      <p>Klik tombol di bawah ini untuk melanjutkan proses reset password. Link ini akan kedaluwarsa dalam waktu 1 jam.</p>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${data.resetLink}" class="btn" style="background-color: #6366f1;">Reset Password Saya</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
    </div>
  `
  return wrapTemplate(content)
}

/**
 * 7. Password Changed Notification
 */
export function generatePasswordChangedEmail(data: {
  name: string
}) {
  const content = `
    <div class="header" style="background: #1e293b;"><h1>KEAMANAN AKUN</h1></div>
    <div class="content">
      <div class="badge badge-blue">Berhasil</div>
      <h2>Password Anda Telah Diubah</h2>
      <p>Halo ${data.name}, ini adalah notifikasi bahwa password akun Anda baru saja berhasil diubah.</p>
      <div class="details-box">
        <div class="detail-row"><div class="detail-label">Kejadian</div><div class="detail-value">Perubahan Password</div></div>
        <div class="detail-row"><div class="detail-label">Waktu</div><div class="detail-value">${new Date().toLocaleString('id-ID')}</div></div>
      </div>
      <p>Jika Anda tidak merasa melakukan perubahan ini, segera hubungi tim IT kami.</p>
      <div style="text-align: center;">
        <a href="${APP_URL}" class="btn">Login ke Akun</a>
      </div>
    </div>
  `
  return wrapTemplate(content)
}
