import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Create a fresh Prisma client instance
const prisma = new PrismaClient()

/**
 * GET /api/sync/status
 * 
 * Get detailed sync status including file counts and recent logs
 */
export async function GET() {
  try {
    // Get file sync statistics
    const [
      totalFiles,
      syncedFiles,
      pendingFiles,
      errorFiles,
      conflictFiles,
      driveOnlyFiles,
      r2OnlyFiles,
      bothStorages,
      recentLogs,
      lastSync,
    ] = await Promise.all([
      prisma.fileSync.count(),
      prisma.fileSync.count({ where: { syncStatus: 'synced' } }),
      prisma.fileSync.count({ where: { syncStatus: 'pending' } }),
      prisma.fileSync.count({ where: { syncStatus: 'error' } }),
      prisma.fileSync.count({ where: { syncStatus: 'conflict' } }),
      prisma.fileSync.count({ where: { source: 'drive' } }),
      prisma.fileSync.count({ where: { source: 'r2' } }),
      prisma.fileSync.count({ where: { source: 'both' } }),
      prisma.syncLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          operation: true,
          filename: true,
          status: true,
          message: true,
          details: true,
          createdAt: true,
        }
      }),
      prisma.syncLog.findFirst({
        where: { status: 'success', operation: { in: ['sync', 'migrate'] } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])
    
    // Calculate storage usage
    const totalSize = await prisma.fileSync.aggregate({
      _sum: { fileSize: true },
    })
    
    return NextResponse.json({
      success: true,
      stats: {
        totalFiles,
        byStatus: {
          synced: syncedFiles,
          pending: pendingFiles,
          error: errorFiles,
          conflict: conflictFiles,
        },
        bySource: {
          drive: driveOnlyFiles,
          r2: r2OnlyFiles,
          both: bothStorages,
        },
        totalSize: totalSize._sum.fileSize || 0,
        lastSync: lastSync?.createdAt || null,
      },
      recentLogs,
    })
    
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
