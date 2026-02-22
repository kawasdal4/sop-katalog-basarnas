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
    
    // Run sync
    const result = await syncStorages({
      direction: 'bidirectional',
    })
    
    const duration = Date.now() - startTime
    
    // Log the cron run
    await db.syncLog.create({
      data: {
        operation: 'sync',
        filename: 'cron',
        status: result.success ? 'success' : 'error',
        message: `Cron sync completed in ${duration}ms. Drive→R2: ${result.driveToR2}, R2→Drive: ${result.r2ToDrive}, Conflicts: ${result.conflicts}`,
        details: JSON.stringify({
          duration,
          driveToR2: result.driveToR2,
          r2ToDrive: result.r2ToDrive,
          conflicts: result.conflicts,
        }),
      }
    })
    
    console.log(`✅ Cron sync completed in ${duration}ms`)
    
    return NextResponse.json({
      success: result.success,
      duration,
      driveToR2: result.driveToR2,
      r2ToDrive: result.r2ToDrive,
      conflicts: result.conflicts,
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
