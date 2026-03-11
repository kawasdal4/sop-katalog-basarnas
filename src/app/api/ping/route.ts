
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'API is working on Vercel',
        timestamp: new Date().toISOString(),
        env: {
            isVercel: !!process.env.VERCEL,
            nodeEnv: process.env.NODE_ENV
        }
    })
}
