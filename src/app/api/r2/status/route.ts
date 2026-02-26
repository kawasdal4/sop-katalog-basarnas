import { NextResponse } from 'next/server'
import { testR2Connection, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({
        connected: false,
        status: 'not_configured',
        message: 'Cloudflare R2 credentials not configured',
        needsSetup: true,
      })
    }

    const connectionTest = await testR2Connection()
    
    if (connectionTest.success) {
      return NextResponse.json({
        connected: true,
        status: 'connected',
        message: connectionTest.message,
        details: connectionTest.details,
      })
    } else {
      return NextResponse.json({
        connected: false,
        status: connectionTest.status,
        message: connectionTest.message,
        details: connectionTest.details,
        setupInstructions: connectionTest.setupInstructions,
      })
    }
  } catch (error) {
    console.error('R2 status error:', error)
    return NextResponse.json({
      connected: false,
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}
