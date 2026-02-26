import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { uploadToR2, isR2Configured, getR2PublicUrl } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

// Microsoft Graph Configuration
const TENANT_ID = process.env.TENANT_ID
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

const EDIT_FOLDER_NAME = 'R2-Edit-Temp'

// Get Microsoft Graph Access Token
async function getGraphAccessToken() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Microsoft Graph credentials not configured')
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`)
  }

  return (await response.json()).access_token
}

// Get SharePoint site and drive
async function getSharePointDrive(accessToken: string): Promise<{ siteId: string; driveId: string }> {
  // Get SharePoint root site
  const rootSiteUrl = 'https://graph.microsoft.com/v1.0/sites/root'
  const rootSiteResponse = await fetch(rootSiteUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  
  if (!rootSiteResponse.ok) {
    console.error('Failed to get root site:', await rootSiteResponse.text())
    throw new Error('Cannot access SharePoint root site')
  }
  
  const rootSite = await rootSiteResponse.json()
  const siteId = rootSite.id
  
  // Get the default document library (drive)
  const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`
  const drivesResponse = await fetch(drivesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  
  if (!drivesResponse.ok) {
    console.error('Failed to get drives:', await drivesResponse.text())
    throw new Error('Cannot access SharePoint drives')
  }
  
  const drivesData = await drivesResponse.json()
  console.log('Available drives:', drivesData.value?.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })))
  
  // Find Documents library
  const docDrive = drivesData.value?.find((d: { name?: string }) => 
    d.name?.toLowerCase() === 'documents' || d.name?.toLowerCase() === 'dokumen'
  ) || drivesData.value?.[0]
  
  if (!docDrive) {
    throw new Error('No document library found')
  }
  
  return { siteId, driveId: docDrive.id }
}

// POST - Sync file from SharePoint back to R2
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admin can sync files' }, { status: 403 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }
    
    const body = await request.json()
    const { fileName, r2Path, siteId: providedSiteId, driveId: providedDriveId, sopId } = body
    
    if (!fileName || !r2Path) {
      return NextResponse.json({ error: 'fileName and r2Path required' }, { status: 400 })
    }
    
    console.log('Sync request:', { fileName, r2Path, providedSiteId, providedDriveId, sopId })
    
    // Get Graph access token
    const accessToken = await getGraphAccessToken()
    
    // Get SharePoint site and drive IDs
    let siteId = providedSiteId
    let driveId = providedDriveId
    
    if (!siteId || !driveId) {
      console.log('No siteId/driveId provided, fetching from SharePoint...')
      const spData = await getSharePointDrive(accessToken)
      siteId = spData.siteId
      driveId = spData.driveId
    }
    
    console.log('Using siteId:', siteId, 'driveId:', driveId)
    
    // Get file content from SharePoint edit folder
    const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${EDIT_FOLDER_NAME}/${fileName}:/content`
    
    console.log('Fetching from SharePoint:', fileUrl)
    const fileResponse = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text()
      console.error('Failed to fetch from SharePoint:', errorText)
      return NextResponse.json({ 
        error: 'File not found in SharePoint',
        details: 'Make sure the file exists in the R2-Edit-Temp folder and you have saved your changes.',
      }, { status: 404 })
    }
    
    // Get file content
    const fileContent = await fileResponse.arrayBuffer()
    console.log('File content size:', fileContent.byteLength)
    
    // Determine content type
    let contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (fileName.endsWith('.xls')) {
      contentType = 'application/vnd.ms-excel'
    } else if (fileName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (fileName.endsWith('.doc')) {
      contentType = 'application/msword'
    } else if (fileName.endsWith('.pdf')) {
      contentType = 'application/pdf'
    }
    
    // Upload to R2 (overwrite existing file)
    console.log('Uploading to R2:', r2Path)
    const fileBuffer = Buffer.from(fileContent)
    
    try {
      await uploadToR2(fileBuffer, fileName, contentType, {
        key: r2Path,
        metadata: {
          syncedAt: new Date().toISOString(),
          syncedBy: user.name || userId,
        }
      })
      console.log('Upload to R2 successful')
    } catch (uploadError) {
      console.error('R2 upload error:', uploadError)
      return NextResponse.json({
        error: 'Gagal mengupload ke R2',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 })
    }

    // ============================================
    // RENUMBER SOP BASED ON UPDATED TIMESTAMP
    // File yang baru di-sync akan menjadi no 1
    // ============================================
    
    if (sopId) {
      const sopFile = await db.sopFile.findUnique({
        where: { id: sopId },
        select: { jenis: true }
      })
      
      if (sopFile) {
        const getPrefix = (jenis: string) => {
          if (jenis === 'SOP') return 'SOP-'
          if (jenis === 'IK') return 'IK-'
          return 'LAINNYA-'
        }
        
        const prefix = getPrefix(sopFile.jenis)
        
        // Update timestamp
        const now = new Date()
        await db.sopFile.update({
          where: { id: sopId },
          data: { updatedAt: now }
        })
        
        // Get all SOPs of the same jenis, ordered by updatedAt DESC
        const allSopsOfJenis = await db.sopFile.findMany({
          where: { jenis: sopFile.jenis },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, nomorSop: true, updatedAt: true }
        })
        
        // Renumber all SOPs based on their position
        for (let i = 0; i < allSopsOfJenis.length; i++) {
          const currentSop = allSopsOfJenis[i]
          const newNumber = i + 1
          const newNomorSop = `${prefix}${String(newNumber).padStart(4, '0')}`
          
          if (currentSop.nomorSop !== newNomorSop) {
            try {
              await db.sopFile.update({
                where: { id: currentSop.id },
                data: { nomorSop: newNomorSop }
              })
              console.log(`📝 Renumbered: ${currentSop.nomorSop} → ${newNomorSop}`)
            } catch (updateError) {
              console.warn(`⚠️ Failed to renumber ${currentSop.nomorSop}:`, updateError)
            }
          }
        }
      }
    }
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'SYNC_FILE',
        deskripsi: `Synced file from SharePoint to R2: ${fileName}`,
      },
    })
    
    const publicUrl = getR2PublicUrl(r2Path)
    
    return NextResponse.json({
      success: true,
      message: `File "${fileName}" successfully synced to R2`,
      r2Path,
      r2Url: publicUrl,
      size: fileContent.byteLength,
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// GET - List files in SharePoint edit folder
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const accessToken = await getGraphAccessToken()
    const { siteId, driveId } = await getSharePointDrive(accessToken)
    
    // List files in edit folder
    const listUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${EDIT_FOLDER_NAME}:/children`
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    if (!listResponse.ok) {
      return NextResponse.json({ 
        files: [],
        message: 'Edit folder not found or empty',
        siteId,
        driveId,
      })
    }
    
    const data = await listResponse.json()
    
    return NextResponse.json({
      success: true,
      siteId,
      driveId,
      files: data.value?.map((file: { id: string; name: string; size: number; lastModifiedDateTime: string; webUrl: string }) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        lastModified: file.lastModifiedDateTime,
        webUrl: file.webUrl,
      })) || [],
    })
    
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// DELETE - Remove file from SharePoint after sync
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName required' }, { status: 400 })
    }
    
    const accessToken = await getGraphAccessToken()
    const { siteId, driveId } = await getSharePointDrive(accessToken)
    
    // Delete file from SharePoint
    const deleteUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${EDIT_FOLDER_NAME}/${fileName}`
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    if (!deleteResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to delete file from SharePoint',
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `File ${fileName} deleted from SharePoint`,
    })
    
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
