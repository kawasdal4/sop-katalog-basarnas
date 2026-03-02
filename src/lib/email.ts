/**
 * Email Service
 * 
 * Handles email notifications for the SOP Katalog system
 * Using Brevo (Sendinblue) SMTP
 */

import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

// Email configuration - Brevo SMTP
const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@sop-katalog.basarnas.go.id'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'E-Katalog SOP Direktorat Kesiapsiagaan'

// Debug logging
console.log('[Email Service] Configuration:', {
  smtpHost: SMTP_HOST,
  smtpPort: SMTP_PORT,
  hasSmtpUser: !!SMTP_USER,
  hasSmtpPass: !!SMTP_PASS,
  emailFrom: EMAIL_FROM,
  fromName: EMAIL_FROM_NAME
})

// Create transporter
function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ [Email] SMTP credentials not configured')
    return null
  }

  console.log('[Email Service] Creating transporter')
  
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // use STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

// Email types
export type EmailTemplate = 
  | 'SOP_SUBMITTED'      // Public submission - notify admins
  | 'SOP_APPROVED'       // Submission approved - notify submitter
  | 'SOP_REJECTED'       // Submission rejected - notify submitter
  | 'SOP_UPLOADED'       // New SOP uploaded - notify relevant users
  | 'SOP_UPDATED'        // SOP updated - notify relevant users
  | 'SOP_EXPIRING'       // SOP expiring soon - notify admins
  | 'FILE_EDIT_LOCK'     // File locked for editing - notify admins
  | 'FILE_EDIT_CONFLICT' // Edit conflict detected
  | 'USER_LOGIN_NEW'     // New login from unknown device
  | 'PASSWORD_CHANGED'   // Password changed notification

export interface EmailRecipient {
  email: string
  name?: string | null
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

/**
 * Send email using nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter()
  
  if (!transporter) {
    console.warn('⚠️ [Email] Cannot send email - transporter not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    const toList = recipients.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email)

    console.log('[Email] Preparing to send email:', {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: toList.join(', '),
      subject: options.subject
    })

    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to: toList.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ [Email] Sent successfully:`, {
      messageId: info.messageId,
      response: info.response
    })
    
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as { code?: string })?.code
    console.error('❌ [Email] Failed to send email:', {
      error: errorMessage,
      code: errorCode,
      stack: error instanceof Error ? error.stack : undefined
    })
    return { success: false, error: errorMessage }
  }
}

/**
 * Get all admin users for notifications
 */
export async function getAdminUsers(): Promise<EmailRecipient[]> {
  try {
    const admins = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'DEVELOPER'] }
      },
      select: {
        email: true,
        name: true
      }
    })
    return admins
  } catch (error) {
    console.error('❌ [Email] Failed to get admin users:', error)
    return []
  }
}

/**
 * Get all developer users for CC notifications
 */
export async function getDeveloperUsers(): Promise<EmailRecipient[]> {
  try {
    const developers = await db.user.findMany({
      where: {
        role: 'DEVELOPER'
      },
      select: {
        email: true,
        name: true
      }
    })
    return developers
  } catch (error) {
    console.error('❌ [Email] Failed to get developer users:', error)
    return []
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * SOP Submission Notification (for Admins)
 */
export function generateSopSubmittedEmail(data: {
  nomorSop: string
  judul: string
  kategori: string
  jenis: string
  submitterName?: string | null
  submitterEmail?: string | null
  keterangan?: string | null
  submittedAt: Date
}): { subject: string; html: string; text: string } {
  const { nomorSop, judul, kategori, jenis, submitterName, submitterEmail, keterangan, submittedAt } = data

  const subject = `[Pengajuan Baru] ${nomorSop} - ${judul}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 Pengajuan SOP/IK Baru</h2>
        </div>
        <div class="content">
          <p>Ada pengajuan SOP/IK baru yang memerlukan verifikasi:</p>
          
          <table class="info-table">
            <tr><td>Nomor</td><td>${nomorSop}</td></tr>
            <tr><td>Judul</td><td>${judul}</td></tr>
            <tr><td>Jenis</td><td>${jenis}</td></tr>
            <tr><td>Kategori</td><td>${kategori}</td></tr>
            <tr><td>Tanggal Pengajuan</td><td>${submittedAt.toLocaleDateString('id-ID', { dateStyle: 'full' })}</td></tr>
            ${submitterName ? `<tr><td>Nama Pengaju</td><td>${submitterName}</td></tr>` : ''}
            ${submitterEmail ? `<tr><td>Email Pengaju</td><td>${submitterEmail}</td></tr>` : ''}
            ${keterangan ? `<tr><td>Keterangan</td><td>${keterangan}</td></tr>` : ''}
          </table>
          
          <p>Silakan login ke sistem E-Katalog SOP untuk melakukan verifikasi.</p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sop-katalog-basarnas.vercel.app'}" class="btn">Buka E-Katalog SOP</a>
          </p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Pengajuan SOP/IK Baru

Nomor: ${nomorSop}
Judul: ${judul}
Jenis: ${jenis}
Kategori: ${kategori}
Tanggal Pengajuan: ${submittedAt.toLocaleDateString('id-ID')}
${submitterName ? `Nama Pengaju: ${submitterName}` : ''}
${submitterEmail ? `Email Pengaju: ${submitterEmail}` : ''}
${keterangan ? `Keterangan: ${keterangan}` : ''}

Silakan login ke sistem E-Katalog SOP untuk melakukan verifikasi.
  `.trim()

  return { subject, html, text }
}

/**
 * SOP Approved Notification (for Submitter)
 */
export function generateSopApprovedEmail(data: {
  nomorSop: string
  judul: string
  jenis: string
  verifiedBy?: string
  verifiedAt: Date
}): { subject: string; html: string; text: string } {
  const { nomorSop, judul, jenis, verifiedBy, verifiedAt } = data

  const subject = `✅ ${nomorSop} telah disetujui`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 5px; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Pengajuan Disetujui</h2>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>
          
          <p>Selamat! Pengajuan ${jenis} Anda telah disetujui dan dipublikasikan:</p>
          
          <table class="info-table">
            <tr><td>Nomor</td><td>${nomorSop}</td></tr>
            <tr><td>Judul</td><td>${judul}</td></tr>
            <tr><td>Jenis</td><td>${jenis}</td></tr>
            <tr><td>Tanggal Verifikasi</td><td>${verifiedAt.toLocaleDateString('id-ID', { dateStyle: 'full' })}</td></tr>
            ${verifiedBy ? `<tr><td>Diverifikasi oleh</td><td>Admin</td></tr>` : ''}
          </table>
          
          <p>Terima kasih atas kontribusi Anda dalam pengembangan SOP/IK di BASARNAS.</p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sop-katalog-basarnas.vercel.app'}" class="btn">Lihat di E-Katalog SOP</a>
          </p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Pengajuan Disetujui ✅

Selamat! Pengajuan ${jenis} Anda telah disetujui:

Nomor: ${nomorSop}
Judul: ${judul}
Jenis: ${jenis}
Tanggal Verifikasi: ${verifiedAt.toLocaleDateString('id-ID')}
${verifiedBy ? 'Diverifikasi oleh: Admin' : ''}

Terima kasih atas kontribusi Anda.
  `.trim()

  return { subject, html, text }
}

/**
 * SOP Rejected Notification (for Submitter)
 */
export function generateSopRejectedEmail(data: {
  nomorSop: string
  judul: string
  jenis: string
  rejectionReason?: string | null
  verifiedAt: Date
}): { subject: string; html: string; text: string } {
  const { nomorSop, judul, jenis, rejectionReason, verifiedAt } = data

  const subject = `❌ ${nomorSop} ditolak`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>❌ Pengajuan Ditolak</h2>
        </div>
        <div class="content">
          <p>Mohon maaf, pengajuan ${jenis} Anda tidak dapat disetujui:</p>
          
          <table class="info-table">
            <tr><td>Nomor</td><td>${nomorSop}</td></tr>
            <tr><td>Judul</td><td>${judul}</td></tr>
            <tr><td>Jenis</td><td>${jenis}</td></tr>
            <tr><td>Tanggal</td><td>${verifiedAt.toLocaleDateString('id-ID', { dateStyle: 'full' })}</td></tr>
          </table>
          
          ${rejectionReason ? `
          <div class="reason-box">
            <strong>Alasan Penolakan:</strong><br>
            ${rejectionReason}
          </div>
          ` : ''}
          
          <p>Anda dapat mengajukan ulang dengan perbaikan yang diperlukan atau menghubungi admin untuk informasi lebih lanjut.</p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Pengajuan Ditolak ❌

Mohon maaf, pengajuan ${jenis} Anda tidak dapat disetujui:

Nomor: ${nomorSop}
Judul: ${judul}
Jenis: ${jenis}
Tanggal: ${verifiedAt.toLocaleDateString('id-ID')}

${rejectionReason ? `Alasan Penolakan: ${rejectionReason}` : ''}

Anda dapat mengajukan ulang dengan perbaikan yang diperlukan.
  `.trim()

  return { subject, html, text }
}

/**
 * New SOP Uploaded Notification
 */
export function generateSopUploadedEmail(data: {
  nomorSop: string
  judul: string
  jenis: string
  kategori: string
  tahun: number
  uploadedBy: string
  uploadedAt: Date
}): { subject: string; html: string; text: string } {
  const { nomorSop, judul, jenis, kategori, tahun, uploadedBy, uploadedAt } = data

  const subject = `📄 ${jenis} Baru: ${nomorSop} - ${judul}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📄 ${jenis} Baru Diunggah</h2>
        </div>
        <div class="content">
          <p>Ada ${jenis} baru yang telah diunggah ke sistem:</p>
          
          <table class="info-table">
            <tr><td>Nomor</td><td>${nomorSop}</td></tr>
            <tr><td>Judul</td><td>${judul}</td></tr>
            <tr><td>Jenis</td><td>${jenis}</td></tr>
            <tr><td>Kategori</td><td>${kategori}</td></tr>
            <tr><td>Tahun</td><td>${tahun}</td></tr>
            <tr><td>Tanggal Upload</td><td>${uploadedAt.toLocaleDateString('id-ID', { dateStyle: 'full' })}</td></tr>
            <tr><td>Diupload oleh</td><td>${uploadedBy}</td></tr>
          </table>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sop-katalog-basarnas.vercel.app'}" class="btn">Lihat di E-Katalog SOP</a>
          </p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
${jenis} Baru Diunggah

Nomor: ${nomorSop}
Judul: ${judul}
Jenis: ${jenis}
Kategori: ${kategori}
Tahun: ${tahun}
Tanggal Upload: ${uploadedAt.toLocaleDateString('id-ID')}
Diupload oleh: ${uploadedBy}
  `.trim()

  return { subject, html, text }
}

/**
 * Password Changed Notification
 */
export function generatePasswordChangedEmail(data: {
  userName: string
  changedAt: Date
}): { subject: string; html: string; text: string } {
  const { userName, changedAt } = data

  const subject = `🔐 Password Anda telah diubah`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 Password Diubah</h2>
        </div>
        <div class="content">
          <p>Halo ${userName},</p>
          
          <p>Password akun Anda di E-Katalog SOP telah berhasil diubah pada:</p>
          
          <p><strong>${changedAt.toLocaleDateString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}</strong></p>
          
          <div class="warning-box">
            <strong>⚠️ Perhatian:</strong><br>
            Jika Anda tidak merasa mengubah password, segera hubungi administrator untuk mengamankan akun Anda.
          </div>
          
          <p>Terima kasih.</p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Password Diubah

Halo ${userName},

Password akun Anda di E-Katalog SOP telah berhasil diubah pada:
${changedAt.toLocaleDateString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}

PERHATIAN: Jika Anda tidak merasa mengubah password, segera hubungi administrator.
  `.trim()

  return { subject, html, text }
}

/**
 * File Lock Conflict Notification
 */
export function generateFileConflictEmail(data: {
  fileName: string
  lockedBy: { name: string | null; email: string }
  lockedAt: Date
  attemptedBy: { name: string | null; email: string }
  attemptedAt: Date
}): { subject: string; html: string; text: string } {
  const { fileName, lockedBy, lockedAt, attemptedBy, attemptedAt } = data

  const subject = `⚠️ Konflik Edit File: ${fileName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ea580c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .warning-box { background: #fef2f2; border-left: 4px solid #ea580c; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Konflik Edit File</h2>
        </div>
        <div class="content">
          <p>Ada percobaan akses ke file yang sedang dikunci:</p>
          
          <table class="info-table">
            <tr><td>File</td><td>${fileName}</td></tr>
            <tr><td>Dikunci oleh</td><td>${lockedBy.name || lockedBy.email}</td></tr>
            <tr><td>Sejak</td><td>${lockedAt.toLocaleDateString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</td></tr>
          </table>
          
          <div class="warning-box">
            <strong>Percobaan Akses:</strong><br>
            User ${attemptedBy.name || attemptedBy.email} mencoba mengakses file ini pada ${attemptedAt.toLocaleDateString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}.
          </div>
          
          <p>File akan tersedia setelah sesi edit selesai atau Anda dapat melakukan force sync jika diperlukan.</p>
        </div>
        <div class="footer">
          Email ini dikirim otomatis oleh Sistem E-Katalog SOP Direktorat Kesiapsiagaan BASARNAS
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Konflik Edit File

File: ${fileName}
Dikunci oleh: ${lockedBy.name || lockedBy.email}
Sejak: ${lockedAt.toLocaleDateString('id-ID')}

Percobaan Akses: User ${attemptedBy.name || attemptedBy.email} mencoba mengakses file ini pada ${attemptedAt.toLocaleDateString('id-ID')}.

File akan tersedia setelah sesi edit selesai.
  `.trim()

  return { subject, html, text }
}

// ============================================================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================================================

/**
 * Notify admins about new SOP submission
 */
export async function notifyAdminsNewSubmission(sopData: {
  nomorSop: string
  judul: string
  kategori: string
  jenis: string
  submitterName?: string | null
  submitterEmail?: string | null
  keterangan?: string | null
  submittedAt: Date
}): Promise<void> {
  try {
    const admins = await getAdminUsers()
    if (admins.length === 0) {
      console.warn('⚠️ [Email] No admin users to notify')
      return
    }

    const { subject, html, text } = generateSopSubmittedEmail(sopData)
    
    await sendEmail({
      to: admins,
      subject,
      html,
      text
    })
    
    console.log(`📧 [Email] Notified ${admins.length} admins about new submission: ${sopData.nomorSop}`)
  } catch (error) {
    console.error('❌ [Email] Failed to notify admins:', error)
  }
}

/**
 * Notify submitter about approval (with CC to DEVELOPER)
 */
export async function notifySubmitterApproved(
  submitterEmail: string,
  submitterName: string | null,
  sopData: {
    nomorSop: string
    judul: string
    jenis: string
    verifiedBy?: string
    verifiedAt: Date
  }
): Promise<void> {
  try {
    const { subject, html, text } = generateSopApprovedEmail(sopData)
    
    // Get developers for CC
    const developers = await getDeveloperUsers()
    
    // Build recipient list: submitter + developers
    const recipients: EmailRecipient[] = [
      { email: submitterEmail, name: submitterName }
    ]
    
    // Add developers to recipients (they get all notifications)
    for (const dev of developers) {
      if (dev.email !== submitterEmail) { // Avoid duplicate
        recipients.push(dev)
      }
    }
    
    await sendEmail({
      to: recipients,
      subject,
      html,
      text
    })
    
    console.log(`📧 [Email] Notified submitter + ${developers.length} developers about approval: ${sopData.nomorSop}`)
  } catch (error) {
    console.error('❌ [Email] Failed to notify submitter:', error)
  }
}

/**
 * Notify submitter about rejection (with CC to DEVELOPER)
 */
export async function notifySubmitterRejected(
  submitterEmail: string,
  submitterName: string | null,
  sopData: {
    nomorSop: string
    judul: string
    jenis: string
    rejectionReason?: string | null
    verifiedAt: Date
  }
): Promise<void> {
  try {
    const { subject, html, text } = generateSopRejectedEmail(sopData)
    
    // Get developers for CC
    const developers = await getDeveloperUsers()
    
    // Build recipient list: submitter + developers
    const recipients: EmailRecipient[] = [
      { email: submitterEmail, name: submitterName }
    ]
    
    // Add developers to recipients (they get all notifications)
    for (const dev of developers) {
      if (dev.email !== submitterEmail) { // Avoid duplicate
        recipients.push(dev)
      }
    }
    
    await sendEmail({
      to: recipients,
      subject,
      html,
      text
    })
    
    console.log(`📧 [Email] Notified submitter + ${developers.length} developers about rejection: ${sopData.nomorSop}`)
  } catch (error) {
    console.error('❌ [Email] Failed to notify submitter:', error)
  }
}

/**
 * Notify admins about new SOP upload
 */
export async function notifyAdminsNewUpload(sopData: {
  nomorSop: string
  judul: string
  jenis: string
  kategori: string
  tahun: number
  uploadedBy: string
  uploadedAt: Date
}): Promise<void> {
  try {
    const admins = await getAdminUsers()
    if (admins.length === 0) {
      console.warn('⚠️ [Email] No admin users to notify')
      return
    }

    const { subject, html, text } = generateSopUploadedEmail(sopData)
    
    await sendEmail({
      to: admins,
      subject,
      html,
      text
    })
    
    console.log(`📧 [Email] Notified ${admins.length} admins about new upload: ${sopData.nomorSop}`)
  } catch (error) {
    console.error('❌ [Email] Failed to notify admins:', error)
  }
}

/**
 * Notify user about password change
 */
export async function notifyPasswordChanged(
  userEmail: string,
  userName: string
): Promise<void> {
  try {
    const { subject, html, text } = generatePasswordChangedEmail({
      userName,
      changedAt: new Date()
    })
    
    await sendEmail({
      to: { email: userEmail, name: userName },
      subject,
      html,
      text
    })
    
    console.log(`📧 [Email] Notified user about password change: ${userEmail}`)
  } catch (error) {
    console.error('❌ [Email] Failed to notify user:', error)
  }
}
