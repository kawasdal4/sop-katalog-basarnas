import { NextRequest, NextResponse } from 'next/server'
import { syncStorages } from '@/lib/sync-service'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * GET /api/sync/cron
 * 
 * Cron endpoint for automatic sync (every 5 minutes)
 * 
 * Security: Verify cron secret to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('⏰ Cron sync triggered')
  
  try {
    // Verify cron secret (security measure)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && secret !== cronSecret) {
      console.warn('❌ Unauthorized cron attempt')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 })
    }
    
    // Run sync (R2 -> Drive Backup Only)
    const result = await syncStorages()
    
    const duration = Date.now() - startTime
    
    // Log the cron run
    await db.syncLog.create({
      data: {
        operation: 'sync',
        filename: 'cron',
        status: result.success ? 'success' : 'error',
        message: `Cron backup sync completed in ${duration}ms. R2→Drive: ${result.r2ToDrive}, Errors: ${result.errors.length}`,
        details: JSON.stringify({
          duration,
          r2ToDrive: result.r2ToDrive,
          errors: result.errors.length
        }),
      }
    })
    
    console.log(`✅ Cron backup sync completed in ${duration}ms`)
    
    return NextResponse.json({
      success: result.success,
      duration,
      r2ToDrive: result.r2ToDrive,
      errors: result.errors.length,
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('❌ Cron sync failed:', error)
    
    // Log the error
    await db.syncLog.create({
      data: {
        operation: 'sync',
        filename: 'cron',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: JSON.stringify({ duration }),
      }
    })
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    }, { status: 500 })
  }
}
