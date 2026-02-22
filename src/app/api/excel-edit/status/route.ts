/**
 * Edit Status Endpoint
 * 
 * Check status of editing sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { listEditFolderFiles, parseFileMetadata } from '@/lib/graph-api'

/**
 * GET - List files currently in edit folder
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const driveItemId = searchParams.get('driveItemId')
    
    // If specific item requested
    if (driveItemId) {
      const files = await listEditFolderFiles()
      const file = files.find(f => f.id === driveItemId)
      
      if (!file) {
        return NextResponse.json({
          status: 'synced',
          message: 'File not in edit folder - likely already synced',
        })
      }
      
      return NextResponse.json({
        status: 'editing',
        file: {
          id: file.id,
          name: file.name,
          lastModified: file.lastModifiedDateTime,
          size: file.size,
        },
      })
    }
    
    // List all files in edit folder
    const files = await listEditFolderFiles()
    
    const editSessions = files.map(file => {
      const meta = parseFileMetadata(file.description)
      return {
        driveItemId: file.id,
        fileName: file.name,
        r2Path: meta.r2Path,
        sessionId: meta.sessionId,
        lastModified: file.lastModifiedDateTime,
        size: file.size,
      }
    })
    
    return NextResponse.json({
      success: true,
      count: editSessions.length,
      sessions: editSessions,
    })
    
  } catch (error) {
    console.error('❌ Status check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    }, { status: 500 })
  }
}
