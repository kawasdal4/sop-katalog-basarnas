import { NextResponse } from 'next/server'
import { isR2Configured, isStorageMockMode, getR2Config, listR2Objects } from '@/lib/r2-storage'
import { db } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const config = getR2Config()
        
        // 1. Check DB
        let dbStatus = 'checking'
        let userCount = 0
        try {
            userCount = await db.user.count()
            dbStatus = 'connected'
        } catch (e: any) {
            dbStatus = `error: ${e.message}`
        }

        // 2. Check R2 Connectivity
        let r2Status = 'checking'
        let objectCount = 0
        try {
            const objects = await listR2Objects('', 1)
            objectCount = objects.length
            r2Status = 'connected'
        } catch (e: any) {
            r2Status = `error: ${e.message}`
        }

        return NextResponse.json({
            status: 'diagnostic_complete',
            timestamp: new Date().toISOString(),
            isVercel: !!process.env.VERCEL,
            nodeEnv: process.env.NODE_ENV,
            database: {
                status: dbStatus,
                userCount
            },
            r2: {
                status: r2Status,
                isConfigured: isR2Configured(),
                isMockMode: isStorageMockMode(),
                bucket: config.bucketName,
                hasAccountId: !!config.accountId,
                hasAccessKey: !!config.accessKeyId,
                hasSecretKey: !!config.secretAccessKey,
                publicUrlPrefix: config.publicUrl ? `${config.publicUrl.substring(0, 15)}...` : null,
            },
            filesystem: {
                cwd: process.cwd(),
                logoExists: await (async () => {
                    try {
                        await fs.access(path.join(process.cwd(), 'public', 'logo.png'))
                        return true
                    } catch { return false }
                })(),
                logoSarExists: await (async () => {
                    try {
                        await fs.access(path.join(process.cwd(), 'public', 'logo-sar.png'))
                        return true
                    } catch { return false }
                })()
            }
        })
    } catch (err: any) {
        return NextResponse.json({
            status: 'error',
            message: err.message,
            stack: err.stack?.substring(0, 100)
        }, { status: 500 })
    }
}
