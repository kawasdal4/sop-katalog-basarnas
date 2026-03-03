import { NextRequest, NextResponse } from 'next/server'
import { testR2Connection, listR2Objects, isR2Configured } from '@/lib/r2-storage'

/**
 * GET /api/test-r2
 * 
 * Diagnostic route to test R2 connectivity on Vercel
 */
export async function GET(request: NextRequest) {
    // Basic security check - simple secret query param
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== 'basarnas-debug-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const configDetails = {
            isConfigured: isR2Configured(),
            envKeys: {
                R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
                R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
                R2_ACCESS_KEY: !!process.env.R2_ACCESS_KEY,
                R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
                R2_SECRET_KEY: !!process.env.R2_SECRET_KEY,
                R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
                R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
            }
        }

        const connection = await testR2Connection()

        let files: string[] = []
        if (connection.success) {
            const objects = await listR2Objects(undefined, 10)
            files = objects.map(o => o.key)
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            config: configDetails,
            connection,
            recentFiles: files
        })

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
