import { NextRequest, NextResponse } from 'next/server'
import { 
  performAutoBackup, 
  getBackupStatus, 
  checkIfBackupNeeded 
} from '@/lib/auto-backup'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * POST /api/backup
 * 
 * Trigger automatic backup from R2 to Google Drive
 * 
 * Body:
 * - action: 'backup' | 'check' | 'status'
 * - dryRun: boolean (for backup action)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, dryRun } = body
    
    console.log(`🔄 Backup API called: action=${action}`)
    
    switch (action) {
      case 'backup':
        const backupResult = await performAutoBackup({
          dryRun: dryRun || false,
          concurrency: 3,
        })
        
        return NextResponse.json({
          success: backupResult.success,
          action: 'backup',
          result: backupResult,
        })
        
      case 'check':
        const checkResult = await checkIfBackupNeeded()
        return NextResponse.json({
          success: true,
          action: 'check',
          result: checkResult,
        })
        
      case 'status':
        const status = await getBackupStatus()
        return NextResponse.json({
          success: true,
          action: 'status',
          result: status,
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: backup, check, or status',
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Backup API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * GET /api/backup
 * 
 * Get backup status
 */
export async function GET() {
  try {
    const [status, checkResult] = await Promise.all([
      getBackupStatus(),
      checkIfBackupNeeded(),
    ])
    
    return NextResponse.json({
      success: true,
      status,
      checkResult,
    })
    
  } catch (error) {
    console.error('❌ Backup status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
