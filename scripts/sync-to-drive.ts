#!/usr/bin/env node
/**
 * Manual Sync Script: Upload local files to Google Drive
 * 
 * Cara penggunaan:
 * bun run scripts/sync-to-drive.ts
 * 
 * Script ini akan:
 * - Membaca semua file dari database yang belum ada di Google Drive
 * - Upload ke Google Drive menggunakan OAuth2
 * - Update database dengan driveFileId
 */

import { db } from '../src/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { google } from 'googleapis'
import { Readable } from 'stream'
import 'dotenv/config'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

// Get Google Drive config - supports OAuth2
function getGoogleDriveConfig() {
  // OAuth2 (preferred for personal Gmail)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  
  // Common
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const ownerEmail = process.env.GOOGLE_OWNER_EMAIL

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not set')
  }

  if (clientId && clientSecret && refreshToken) {
    return { 
      clientId, 
      clientSecret, 
      refreshToken, 
      folderId, 
      ownerEmail,
      authMethod: 'oauth2' as const
    }
  }

  throw new Error('OAuth2 credentials not configured. Need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN')
}

// Create Drive client with OAuth2
function createDriveClient() {
  const config = getGoogleDriveConfig()
  
  if (config.authMethod === 'oauth2') {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    )
    
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    })
    
    return google.drive({ version: 'v3', auth: oauth2Client })
  }
  
  throw new Error('Unsupported auth method')
}

// Buffer to stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

// Upload single file
async function uploadFile(
  drive: ReturnType<typeof google.drive>,
  config: ReturnType<typeof getGoogleDriveConfig>,
  fileName: string,
  filePath: string
): Promise<string | null> {
  try {
    console.log(`  📤 Uploading ${fileName}...`)
    
    // Read file
    const fileBuffer = await readFile(filePath)
    
    // Determine MIME type
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
    }
    const mimeType = mimeTypes[ext] || 'application/octet-stream'
    
    // Upload
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [config.folderId],
      },
      media: {
        mimeType,
        body: bufferToStream(fileBuffer),
      },
      fields: 'id, name, owners',
      supportsAllDrives: true,
    })
    
    const fileId = response.data.id
    if (!fileId) {
      throw new Error('No file ID returned')
    }
    
    console.log(`  ✅ Uploaded: ${fileId}`)
    console.log(`     Owner: ${response.data.owners?.[0]?.emailAddress}`)
    
    return fileId
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

// Main sync function
async function syncToDrive() {
  console.log('🔄 Starting sync to Google Drive...\n')
  
  try {
    const config = getGoogleDriveConfig()
    console.log(`📁 Target folder: ${config.folderId}`)
    console.log(`🔐 Auth method: ${config.authMethod?.toUpperCase()}`)
    console.log(`📧 Owner email: ${config.ownerEmail || 'Not set'}\n`)
    
    // Create Drive client
    const drive = createDriveClient()
    
    // Get all SOP files without driveFileId
    const sopFiles = await db.sopFile.findMany({
      where: {
        driveFileId: null,
      },
      orderBy: { uploadedAt: 'asc' }
    })
    
    console.log(`📊 Found ${sopFiles.length} files to sync\n`)
    
    if (sopFiles.length === 0) {
      console.log('✅ All files are already synced!')
      return
    }
    
    let successCount = 0
    let failCount = 0
    
    for (const sop of sopFiles) {
      console.log(`\n📄 Processing: ${sop.nomorSop} - ${sop.judul}`)
      
      // Get local file path
      const localPath = join(UPLOADS_DIR, sop.filePath)
      
      try {
        const driveFileId = await uploadFile(drive, config, sop.fileName, localPath)
        
        if (driveFileId) {
          // Update database
          await db.sopFile.update({
            where: { id: sop.id },
            data: { driveFileId }
          })
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
        failCount++
      }
    }
    
    console.log(`\n\n📊 Sync Summary:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : 'Unknown error')
    console.log('\nFile tetap aman di local storage.')
  }
}

// Run
syncToDrive()
  .then(() => {
    console.log('\n✨ Sync process completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
