import { NextRequest, NextResponse } from 'next/server'
import { migrateFromDriveToR2, syncStorages, getSyncStats } from '@/lib/sync-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * POST /api/sync
 * 
 * Body:
 * - action: 'migrate' | 'sync' | 'stats'
 * - dryRun: boolean (for migration)
 * - direction: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional' (for sync)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, dryRun, direction } = body
    
    console.log(`🔄 Sync API called: action=${action}`)
    
    switch (action) {
      case 'migrate':
        const migrationResult = await migrateFromDriveToR2({
          dryRun: dryRun || false,
          overwrite: false,
          concurrency: 3,
        })
        return NextResponse.json({
          success: migrationResult.success,
          action: 'migrate',
          result: migrationResult,
        })
        
      case 'sync':
        const syncResult = await syncStorages({
          direction: direction || 'bidirectional',
        })
        return NextResponse.json({
          success: syncResult.success,
          action: 'sync',
          result: syncResult,
        })
        
      case 'stats':
        const stats = await getSyncStats()
        return NextResponse.json({
          success: true,
          action: 'stats',
          result: stats,
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: migrate, sync, or stats',
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Sync API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * GET /api/sync
 * 
 * Get sync status and statistics
 */
export async function GET() {
  try {
    const stats = await getSyncStats()
    
    return NextResponse.json({
      success: true,
      stats,
    })
    
  } catch (error) {
    console.error('❌ Sync stats error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
