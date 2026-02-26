/**
 * File Lock Service
 * 
 * Handles file locking, session management, and conflict detection
 * for the Desktop Excel Edit + Sync system.
 */

import { db } from '@/lib/db'
import { createHash } from 'crypto'

// Constants - Session duration set to 1 year (525600 minutes) for unlimited time
export const SESSION_DURATION_MINUTES = 525600 // 1 year - effectively unlimited

// Types
export type EditSessionStatus = 'active' | 'completed' | 'expired'
export type EditLogAction = 'started' | 'synced' | 'expired' | 'force_overwrite' | 'cancelled'

export interface EditSession {
  id: string
  objectKey: string
  sopFileId: string | null
  editorUserId: string
  editorEmail: string
  editorName: string | null
  originalHash: string
  lockedAt: Date
  expiresAt: Date
  status: EditSessionStatus
  lastSyncedAt: Date | null
  completedAt: Date | null
}

export interface LockCheckResult {
  isLocked: boolean
  lockedBy?: {
    email: string
    name: string | null
    lockedAt: Date
    remainingMinutes: number
  }
  canProceed: boolean
  message?: string
}

export interface ConflictCheckResult {
  hasConflict: boolean
  originalHash: string
  currentHash: string
  message?: string
  lastEditor?: {
    email: string
    name: string | null
    syncedAt: Date | null
  }
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function calculateHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Check if FileEditSession table exists
 */
async function checkTableExists(): Promise<boolean> {
  try {
    // Try to query the table
    await db.$queryRaw`SELECT 1 FROM "FileEditSession" LIMIT 1`
    return true
  } catch {
    console.warn('⚠️ [FileLock] FileEditSession table does not exist - file locking disabled')
    return false
  }
}

// Cache the table existence check
let tableExistsCache: boolean | null = null

async function isTableAvailable(): Promise<boolean> {
  if (tableExistsCache !== null) return tableExistsCache
  tableExistsCache = await checkTableExists()
  return tableExistsCache
}

/**
 * Expire all stale sessions (older than expiresAt)
 */
export async function expireStaleSessions(): Promise<number> {
  if (!(await isTableAvailable())) return 0
  
  try {
    const now = new Date()
    
    const result = await db.$executeRaw`
      UPDATE "FileEditSession" 
      SET status = 'expired' 
      WHERE status = 'active' AND "expiresAt" < ${now}
    `

    if (result > 0) {
      console.log(`🔒 [FileLock] Expired ${result} stale sessions`)
    }

    return result
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to expire stale sessions:', error)
    return 0
  }
}

/**
 * Check if a file is locked by another user
 */
export async function checkFileLock(
  objectKey: string,
  currentUserId: string
): Promise<LockCheckResult> {
  // If table doesn't exist, always allow
  if (!(await isTableAvailable())) {
    return {
      isLocked: false,
      canProceed: true
    }
  }

  try {
    // First, expire any stale sessions
    await expireStaleSessions()

    // Find active session for this object using raw query
    const sessions = await db.$queryRaw<Array<{
      id: string
      objectKey: string
      "editorUserId": string
      "editorEmail": string
      "editorName": string | null
      "lockedAt": Date
      "expiresAt": Date
      status: string
    }>>`
      SELECT id, "objectKey", "editorUserId", "editorEmail", "editorName", "lockedAt", "expiresAt", status
      FROM "FileEditSession"
      WHERE "objectKey" = ${objectKey} 
        AND status = 'active' 
        AND "expiresAt" > NOW()
      ORDER BY "lockedAt" DESC
      LIMIT 1
    `

    const activeSession = sessions[0]

    if (!activeSession) {
      return {
        isLocked: false,
        canProceed: true
      }
    }

    // If locked by the same user, allow proceeding (extend session)
    if (activeSession.editorUserId === currentUserId) {
      return {
        isLocked: true,
        canProceed: true,
        lockedBy: {
          email: activeSession.editorEmail,
          name: activeSession.editorName,
          lockedAt: activeSession.lockedAt,
          remainingMinutes: Math.round((activeSession.expiresAt.getTime() - Date.now()) / 60000)
        },
        message: 'Anda memiliki sesi edit aktif untuk file ini'
      }
    }

    // Locked by different user
    const remainingMinutes = Math.round((activeSession.expiresAt.getTime() - Date.now()) / 60000)
    
    return {
      isLocked: true,
      canProceed: false,
      lockedBy: {
        email: activeSession.editorEmail,
        name: activeSession.editorName,
        lockedAt: activeSession.lockedAt,
        remainingMinutes: Math.max(0, remainingMinutes)
      },
      message: `File sedang diedit oleh ${activeSession.editorEmail} sejak ${formatTimeAgo(activeSession.lockedAt)}. Sisa waktu: ${remainingMinutes} menit.`
    }
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to check file lock:', error)
    return {
      isLocked: false,
      canProceed: true
    }
  }
}

/**
 * Create a new edit session (lock the file)
 */
export async function createEditSession(
  objectKey: string,
  sopFileId: string | undefined,
  userId: string,
  userEmail: string,
  userName: string | null,
  originalHash: string
): Promise<EditSession> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MINUTES * 60 * 1000)

  // If table doesn't exist, return a mock session
  if (!(await isTableAvailable())) {
    console.log(`🔒 [FileLock] Table not available - creating mock session`)
    return {
      id: `mock-${Date.now()}`,
      objectKey,
      sopFileId: sopFileId || null,
      editorUserId: userId,
      editorEmail: userEmail,
      editorName: userName,
      originalHash,
      lockedAt: now,
      expiresAt,
      status: 'active',
      lastSyncedAt: null,
      completedAt: null
    }
  }

  try {
    // Create session using raw query
    const result = await db.$queryRaw<Array<{id: string}>>`
      INSERT INTO "FileEditSession" (id, "objectKey", "sopFileId", "editorUserId", "editorEmail", "editorName", "originalHash", "lockedAt", "expiresAt", status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${objectKey}, ${sopFileId || null}, ${userId}, ${userEmail}, ${userName}, ${originalHash}, ${now}, ${expiresAt}, 'active', ${now}, ${now})
      RETURNING id
    `

    const sessionId = result[0]?.id

    // Log the start
    await logEditAction(
      objectKey,
      userId,
      userEmail,
      userName,
      'started',
      sessionId,
      { sopFileId, originalHash: originalHash.slice(0, 16) + '...' }
    )

    console.log(`🔒 [FileLock] Session created: ${sessionId} for ${objectKey} by ${userEmail}`)

    return {
      id: sessionId || `mock-${Date.now()}`,
      objectKey,
      sopFileId: sopFileId || null,
      editorUserId: userId,
      editorEmail: userEmail,
      editorName: userName,
      originalHash,
      lockedAt: now,
      expiresAt,
      status: 'active',
      lastSyncedAt: null,
      completedAt: null
    }
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to create session:', error)
    // Return mock session
    return {
      id: `mock-${Date.now()}`,
      objectKey,
      sopFileId: sopFileId || null,
      editorUserId: userId,
      editorEmail: userEmail,
      editorName: userName,
      originalHash,
      lockedAt: now,
      expiresAt,
      status: 'active',
      lastSyncedAt: null,
      completedAt: null
    }
  }
}

/**
 * Validate session and check for conflicts
 */
export async function validateSession(
  sessionId: string,
  userId: string,
  currentR2Hash: string
): Promise<{
  valid: boolean
  session?: EditSession
  conflict?: ConflictCheckResult
  error?: string
}> {
  // If table doesn't exist, always valid
  if (!(await isTableAvailable())) {
    return {
      valid: true,
      session: {
        id: sessionId,
        objectKey: '',
        sopFileId: null,
        editorUserId: userId,
        editorEmail: '',
        editorName: null,
        originalHash: currentR2Hash,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000),
        status: 'active',
        lastSyncedAt: null,
        completedAt: null
      }
    }
  }

  try {
    // Expire stale sessions first
    await expireStaleSessions()

    // Find session
    const sessions = await db.$queryRaw<Array<{
      id: string
      objectKey: string
      "sopFileId": string | null
      "editorUserId": string
      "editorEmail": string
      "editorName": string | null
      "originalHash": string
      "lockedAt": Date
      "expiresAt": Date
      status: string
      "lastSyncedAt": Date | null
      "completedAt": Date | null
    }>>`
      SELECT * FROM "FileEditSession" WHERE id = ${sessionId}
    `

    const session = sessions[0]

    if (!session) {
      return {
        valid: false,
        error: 'Sesi tidak ditemukan'
      }
    }

    // Check ownership
    if (session.editorUserId !== userId) {
      return {
        valid: false,
        error: 'Sesi ini bukan milik Anda'
      }
    }

    // Check if already completed or expired
    if (session.status === 'completed') {
      return {
        valid: false,
        error: 'Sesi sudah selesai'
      }
    }

    if (session.status === 'expired' || session.expiresAt < new Date()) {
      return {
        valid: false,
        error: 'Sesi sudah kadaluarsa'
      }
    }

    // Check for conflicts (hash changed in R2)
    const hasConflict = session.originalHash !== currentR2Hash

    if (hasConflict) {
      return {
        valid: true,
        session: session as EditSession,
        conflict: {
          hasConflict: true,
          originalHash: session.originalHash,
          currentHash: currentR2Hash,
          message: 'File telah diperbarui oleh user lain sejak Anda mulai edit. Pilih "Force Overwrite" untuk menimpa atau "Cancel" untuk membatalkan.'
        }
      }
    }

    return {
      valid: true,
      session: session as EditSession
    }
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to validate session:', error)
    return {
      valid: true,
      session: {
        id: sessionId,
        objectKey: '',
        sopFileId: null,
        editorUserId: userId,
        editorEmail: '',
        editorName: null,
        originalHash: currentR2Hash,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000),
        status: 'active',
        lastSyncedAt: null,
        completedAt: null
      }
    }
  }
}

/**
 * Complete a session (successful sync)
 */
export async function completeSession(
  sessionId: string,
  newHash: string
): Promise<void> {
  if (!(await isTableAvailable())) return

  try {
    const now = new Date()

    await db.$executeRaw`
      UPDATE "FileEditSession" 
      SET status = 'completed', "completedAt" = ${now}, "lastSyncedAt" = ${now}, "updatedAt" = ${now}
      WHERE id = ${sessionId}
    `

    console.log(`✅ [FileLock] Session completed: ${sessionId}`)
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to complete session:', error)
  }
}

/**
 * Force complete session (force overwrite)
 */
export async function forceCompleteSession(
  sessionId: string,
  newHash: string
): Promise<void> {
  if (!(await isTableAvailable())) return

  try {
    const now = new Date()

    await db.$executeRaw`
      UPDATE "FileEditSession" 
      SET status = 'completed', "completedAt" = ${now}, "lastSyncedAt" = ${now}, "updatedAt" = ${now}
      WHERE id = ${sessionId}
    `

    console.log(`⚠️ [FileLock] Session force completed: ${sessionId}`)
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to force complete session:', error)
  }
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string): Promise<void> {
  if (!(await isTableAvailable())) return

  try {
    await db.$executeRaw`
      UPDATE "FileEditSession" 
      SET status = 'completed', "updatedAt" = NOW()
      WHERE id = ${sessionId}
    `

    console.log(`🚫 [FileLock] Session cancelled: ${sessionId}`)
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to cancel session:', error)
  }
}

/**
 * Log edit action
 */
export async function logEditAction(
  objectKey: string,
  userId: string,
  userEmail: string,
  userName: string | null,
  action: EditLogAction,
  sessionId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  if (!(await isTableAvailable())) return

  try {
    await db.$executeRaw`
      INSERT INTO "FileEditLog" (id, "objectKey", "editorUserId", "editorEmail", "editorName", action, "sessionId", details, timestamp)
      VALUES (gen_random_uuid(), ${objectKey}, ${userId}, ${userEmail}, ${userName}, ${action}, ${sessionId || null}, ${details ? JSON.stringify(details) : null}, NOW())
    `
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to log edit action:', error)
  }
}

/**
 * Get last editor info for a file
 */
export async function getLastEditor(objectKey: string): Promise<{
  email: string
  name: string | null
  action: string
  timestamp: Date
} | null> {
  if (!(await isTableAvailable())) return null

  try {
    const logs = await db.$queryRaw<Array<{
      "editorEmail": string
      "editorName": string | null
      action: string
      timestamp: Date
    }>>`
      SELECT "editorEmail", "editorName", action, timestamp
      FROM "FileEditLog"
      WHERE "objectKey" = ${objectKey} AND action IN ('synced', 'force_overwrite')
      ORDER BY timestamp DESC
      LIMIT 1
    `

    const lastLog = logs[0]
    if (!lastLog) return null

    return {
      email: lastLog.editorEmail,
      name: lastLog.editorName,
      action: lastLog.action,
      timestamp: lastLog.timestamp
    }
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to get last editor:', error)
    return null
  }
}

/**
 * Get active session for user
 */
export async function getActiveSessionForUser(
  objectKey: string,
  userId: string
): Promise<EditSession | null> {
  if (!(await isTableAvailable())) return null

  try {
    await expireStaleSessions()

    const sessions = await db.$queryRaw<Array<EditSession>>`
      SELECT * FROM "FileEditSession"
      WHERE "objectKey" = ${objectKey}
        AND "editorUserId" = ${userId}
        AND status = 'active'
        AND "expiresAt" > NOW()
      LIMIT 1
    `

    return sessions[0] || null
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to get active session:', error)
    return null
  }
}

/**
 * Extend session expiry (refresh the lock)
 */
export async function extendSession(sessionId: string): Promise<EditSession | null> {
  if (!(await isTableAvailable())) return null

  try {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)

    const sessions = await db.$queryRaw<Array<EditSession>>`
      UPDATE "FileEditSession"
      SET "expiresAt" = ${newExpiresAt}, "updatedAt" = NOW()
      WHERE id = ${sessionId} AND status = 'active'
      RETURNING *
    `

    return sessions[0] || null
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to extend session:', error)
    return null
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'baru saja'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit yang lalu`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam yang lalu`
  
  return `${Math.floor(seconds / 86400)} hari yang lalu`
}
