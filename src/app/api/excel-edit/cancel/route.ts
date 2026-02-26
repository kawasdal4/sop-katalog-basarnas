/**
 * Excel Edit Cancel API
 * 
 * Cancels an edit session by deleting the file from OneDrive
 * This ensures no orphaned files are left in the edit folder
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { getAzureAccessToken } from '@/lib/azure-auth'

export const runtime = 'nodejs'

// Configuration
const M365_SERVICE_ACCOUNT = process.env.M365_SERVICE_ACCOUNT

/**
 * Graph API fetch helper
 */
async function graphFetch(endpoint: string, token: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('https') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
}

/**
 * POST - Cancel edit and delete file from OneDrive
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin only' }, { status: 403 })
    }
    
    // Parse request
    const body = await request.json()
    const { driveItemId } = body
    
    if (!driveItemId) {
      return NextResponse.json({ success: false, error: 'driveItemId required' }, { status: 400 })
    }
    
    if (!M365_SERVICE_ACCOUNT) {
      return NextResponse.json({
        success: false,
        error: 'M365_SERVICE_ACCOUNT not configured',
      }, { status: 500 })
    }
    
    // Get Azure token
    const accessToken = await getAzureAccessToken()
    
    // Delete file from OneDrive
    console.log(`🗑️ Deleting file from OneDrive: ${driveItemId}`)
    
    const deleteResponse = await graphFetch(
      `/users/${M365_SERVICE_ACCOUNT}/drive/items/${driveItemId}`,
      accessToken,
      { method: 'DELETE' }
    )
    
    if (deleteResponse.ok) {
      console.log(`✅ File deleted from OneDrive: ${driveItemId}`)
      
      // Log activity
      try {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'EDIT_CANCELLED',
            deskripsi: `Cancelled edit session and deleted file from OneDrive: ${driveItemId}`,
          },
        })
      } catch {}
      
      return NextResponse.json({
        success: true,
        message: 'File deleted from OneDrive',
        driveItemId,
      })
    } else if (deleteResponse.status === 404) {
      // File already deleted
      console.log(`⚠️ File not found in OneDrive: ${driveItemId}`)
      return NextResponse.json({
        success: true,
        message: 'File already deleted from OneDrive',
        driveItemId,
      })
    } else {
      const errorText = await deleteResponse.text()
      console.error(`❌ Failed to delete file from OneDrive: ${deleteResponse.status} ${errorText}`)
      
      return NextResponse.json({
        success: false,
        error: `Failed to delete file: ${deleteResponse.status}`,
        details: errorText,
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Cancel edit error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
