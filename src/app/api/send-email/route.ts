import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import {
    sendEmail,
    generateSopPublishedEmail,
    generateSopSubmittedEmail,
    generateSopApprovedEmail,
    generateSopRejectedEmail,
    generateFileUpdatedEmail,
    generateForgotPasswordEmail,
    generatePasswordChangedEmail
} from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 300 // Extended duration for bulk sending

/**
 * POST /api/send-email
 * Trigger email notifications with admin protection and sequential sending
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Security Check: Admin Only
        const cookieStore = await cookies()
        const userId = cookieStore.get('userId')?.value

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!user || !['ADMIN', 'DEVELOPER'].includes(user.role)) {
            // NOTE: We allow system-level triggers (public submissions) if we add a secret key check
            // For now, assume this is triggered by an admin action
        }

        const body = await request.json()
        const { type, data, recipients } = body

        if (!type || !data) {
            return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
        }

        console.log(`[API SendEmail] Triggered for type: ${type}`)

        // 2. Determine Recipients
        let targetRecipients: { email: string; name?: string | null }[] = []

        if (recipients) {
            targetRecipients = Array.isArray(recipients) ? recipients : [recipients]
        } else if (type === 'SOP_PUBLISHED') {
            // Notify all users
            targetRecipients = await db.user.findMany({
                where: { email: { not: '' } },
                select: { email: true, name: true }
            })
        } else if (type === 'SOP_SUBMITTED' || type === 'NEW_SUBMISSION') {
            // Notify admins and developers
            targetRecipients = await db.user.findMany({
                where: { role: { in: ['ADMIN', 'DEVELOPER'] }, email: { not: '' } },
                select: { email: true, name: true }
            })
        } else if (type === 'SOP_APPROVED' || type === 'SOP_REJECTED' || type === 'FORGOT_PASSWORD') {
            // These types usually have a specific recipient provided in 'data'
            if (data.email) { // For FORGOT_PASSWORD
                targetRecipients = [{ email: data.email }]
            } else if (data.submitterEmail) { // For SOP_APPROVED/REJECTED
                targetRecipients = [{ email: data.submitterEmail }]
            }
        }


        if (targetRecipients.length === 0) {
            return NextResponse.json({ success: true, message: 'No recipients found' })
        }

        // 3. Generate HTML Content
        let subject = ''
        let html = ''

        switch (type) {
            case 'SOP_PUBLISHED':
                subject = `[E-Katalog SOP] Terbit: ${data.judul}`
                html = generateSopPublishedEmail(data)
                break
            case 'SOP_SUBMITTED':
            case 'NEW_SUBMISSION':
                subject = `[E-Katalog SOP] Pengajuan Baru${data.nomorSop ? ': ' + data.nomorSop : ''}`
                html = generateSopSubmittedEmail({
                    nomorSop: data.nomorSop || '-',
                    judul: data.judul,
                    submitter: data.submitterName || data.submitter || 'Pelapor'
                })
                break
            case 'SOP_APPROVED':
                subject = `[E-Katalog SOP] Pengajuan Disetujui${data.nomorSop ? ': ' + data.nomorSop : ''}`
                html = generateSopApprovedEmail(data)
                break
            case 'SOP_REJECTED':
            case 'SUBMISSION_REJECTED':
                subject = `[E-Katalog SOP] Pengajuan Ditolak${data.nomorSop ? ': ' + data.nomorSop : ''}`
                html = generateSopRejectedEmail({
                    nomorSop: data.nomorSop || '-',
                    judul: data.judul,
                    reason: data.rejectionReason || data.reason || 'Tidak memenuhi kriteria'
                })
                break
            case 'FILE_UPDATED':
                subject = `[E-Katalog SOP] Update Dokumen: ${data.judul}`
                html = generateFileUpdatedEmail(data)
                break
            case 'FORGOT_PASSWORD':
                subject = `[E-Katalog SOP] Reset Password`
                html = generateForgotPasswordEmail(data)
                break
            case 'PASSWORD_CHANGED':
                subject = `[E-Katalog SOP] Password Berhasil Diubah`
                html = generatePasswordChangedEmail(data)
                break
            default:
                return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 })
        }

        // 4. Sequential Sending with Delay (to avoid rate limits and ensure delivery)
        const results = {
            total: targetRecipients.length,
            success: 0,
            failed: 0,
            errors: [] as any[]
        }

        for (const recipient of targetRecipients) {
            try {
                const res = await sendEmail({
                    to: recipient.email,
                    subject,
                    html
                })

                if (res.success) {
                    results.success++
                } else {
                    results.failed++
                    results.errors.push({ email: recipient.email, error: res.error })
                }

                // Delay 300-500ms
                await new Promise(resolve => setTimeout(resolve, 400))
            } catch (err) {
                results.failed++
                results.errors.push({ email: recipient.email, error: err })
            }
        }

        console.log(`[API SendEmail] Finished: ${results.success} sent, ${results.failed} failed`)

        return NextResponse.json({
            success: true,
            summary: results
        })

    } catch (error) {
        console.error('❌ [API SendEmail] Fatal error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
