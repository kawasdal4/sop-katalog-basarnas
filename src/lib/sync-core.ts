import { createHash } from 'crypto'

/**
 * Calculate SHA-256 checksum of a buffer
 */
export function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Generate a unique R2 key for a file
 */
export function generateR2Key(filename: string, folder?: string): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  if (folder) {
    return `${folder}/${timestamp}_${sanitizedFilename}`
  }
  
  return `${timestamp}_${sanitizedFilename}`
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1)
        console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * Compare two dates with tolerance (in milliseconds)
 */
export function datesEqual(
  date1: Date | string | null | undefined,
  date2: Date | string | null | undefined,
  tolerance: number = 1000
): boolean {
  if (!date1 && !date2) return true
  if (!date1 || !date2) return false
  
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  
  return Math.abs(d1 - d2) < tolerance
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255) // Limit filename length
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ]
  
  return supportedTypes.some(type => mimeType.includes(type))
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
  }
  
  return mimeToExt[mimeType] || 'bin'
}

/**
 * Batch process items with concurrency limit
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<{ results: R[]; errors: { item: T; error: Error }[] }> {
  const results: R[] = []
  const errors: { item: T; error: Error }[] = []
  
  const queue = [...items]
  const inProgress = new Set<Promise<void>>()
  
  while (queue.length > 0 || inProgress.size > 0) {
    // Fill up to concurrency limit
    while (queue.length > 0 && inProgress.size < concurrency) {
      const item = queue.shift()!
      
      const promise = processor(item)
        .then(result => {
          results.push(result)
        })
        .catch(error => {
          errors.push({ item, error })
        })
        .finally(() => {
          inProgress.delete(promise)
        })
      
      inProgress.add(promise)
    }
    
    // Wait for at least one to complete
    if (inProgress.size > 0) {
      await Promise.race(inProgress)
    }
  }
  
  return { results, errors }
}

/**
 * Generate sync summary
 */
export interface SyncSummary {
  totalFiles: number
  syncedFiles: number
  skippedFiles: number
  errorFiles: number
  totalBytes: number
  duration: number
  errors: { filename: string; error: string }[]
}

export function createSyncSummary(): {
  addSynced: (filename: string, bytes: number) => void
  addSkipped: (filename: string, reason: string) => void
  addError: (filename: string, error: string) => void
  getSummary: () => SyncSummary
} {
  const startTime = Date.now()
  let syncedFiles = 0
  let skippedFiles = 0
  let errorFiles = 0
  let totalBytes = 0
  const errors: { filename: string; error: string }[] = []
  
  const skippedReasons: Map<string, string> = new Map()
  
  return {
    addSynced: (filename: string, bytes: number) => {
      syncedFiles++
      totalBytes += bytes
      console.log(`✅ Synced: ${filename} (${formatFileSize(bytes)})`)
    },
    addSkipped: (filename: string, reason: string) => {
      skippedFiles++
      skippedReasons.set(filename, reason)
      console.log(`⏭️ Skipped: ${filename} - ${reason}`)
    },
    addError: (filename: string, error: string) => {
      errorFiles++
      errors.push({ filename, error })
      console.error(`❌ Error: ${filename} - ${error}`)
    },
    getSummary: () => ({
      totalFiles: syncedFiles + skippedFiles + errorFiles,
      syncedFiles,
      skippedFiles,
      errorFiles,
      totalBytes,
      duration: Date.now() - startTime,
      errors,
    }),
  }
}
