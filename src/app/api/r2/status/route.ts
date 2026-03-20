import { NextResponse } from 'next/server'
import { testR2Connection, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configured = isR2Configured()

    if (!configured) {
      return NextResponse.json({
        connected: false,
        status: 'not_configured',
        message: 'Cloudflare R2 credentials not configured',
        needsSetup: true,
      })
    }

    const connectionTest = await testR2Connection()
    
    return connectionTest.success 
      ? NextResponse.json({
          connected: true,
          status: 'connected',
          message: connectionTest.message,
        })
      : NextResponse.json({
          connected: false,
          status: connectionTest.status,
          message: connectionTest.message,
        })
  } catch (error) {
    console.error('R2 status error:', error)
    return NextResponse.json({
      connected: false,
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}
