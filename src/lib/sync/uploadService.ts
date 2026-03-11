import { syncService } from './syncService'
import { v4 as uuidv4 } from 'uuid'

export interface UploadMetadata {
  judul: string
  kategori: string
  jenis: string
  lingkup: string | null
  tahun: number
  status: string
  userId: string
  userName: string
}

export async function processOfflineUpload(file: File, metadata: UploadMetadata) {
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined
  
  if (!isTauri) {
    // Fallback for browser (direct API call) - though this service is mainly for desktop
    throw new Error('Offline upload is only supported in the Desktop application.')
  }

  const id = uuidv4()
  const fileName = file.name
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
  
  // 1. Save to local SQLite immediately
  // Note: Binary file storage in SQLite is possible but might be better to handle as a separate sync task
  // For now, we'll store the metadata and a reference to the binary
  
  const sopFileData = {
    id,
    judul: metadata.judul,
    tahun: metadata.tahun,
    kategori: metadata.kategori,
    jenis: metadata.jenis,
    lingkup: metadata.lingkup,
    status: metadata.status || 'AKTIF',
    fileName: fileName,
    fileType: fileExtension,
    uploadedBy: metadata.userId,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublicSubmission: false
  }

  // Add to local database (this will be implemented in syncService)
  await syncService.addLocalData('sop_files', sopFileData)

  // 2. Add to sync queue
  // If we're offline, this stays in the queue
  // If we're online, syncService will try to process it
  await syncService.enqueueOperation({
    table: 'sop_files',
    action: 'CREATE',
    data: sopFileData
  })

  // 3. Handle Binary File Uploads
  // For Tauri, we might need to upload the file separately or as part of the sync
  // For now, we return the local ID so the UI can show progress
  return { id, status: 'queued' }
}
