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
 * Expire all stale sessions (older than expiresAt)
 */
export async function expireStaleSessions(): Promise<number> {
  try {
    const now = new Date()

    const result = await db.fileEditSession.updateMany({
      where: {
        status: 'active',
        expiresAt: {
          lt: now
        }
      },
      data: {
        status: 'expired'
      }
    })

    if (result.count > 0) {
      console.log(`🔒 [FileLock] Expired ${result.count} stale sessions`)
    }

    return result.count
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
  try {
    // First, expire any stale sessions
    await expireStaleSessions()

    const activeSession = await db.fileEditSession.findFirst({
      where: {
        objectKey,
        status: 'active',
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        lockedAt: 'desc'
      }
    })

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

  try {
    const session = await db.fileEditSession.create({
      data: {
        objectKey,
        sopFileId: sopFileId || null,
        editorUserId: userId,
        editorEmail: userEmail,
        editorName: userName,
        originalHash,
        lockedAt: now,
        expiresAt,
        status: 'active'
      }
    })

    const sessionId = session.id

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
  try {
    // Expire stale sessions first
    await expireStaleSessions()

    // Find session
    const session = await db.fileEditSession.findUnique({
      where: { id: sessionId }
    })

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
  try {
    const now = new Date()

    await db.fileEditSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: now,
        lastSyncedAt: now,
        updatedAt: now
      }
    })

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
  try {
    const now = new Date()

    await db.fileEditSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: now,
        lastSyncedAt: now,
        updatedAt: now
      }
    })

    console.log(`⚠️ [FileLock] Session force completed: ${sessionId}`)
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to force complete session:', error)
  }
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string): Promise<void> {
  try {
    await db.fileEditSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        updatedAt: new Date()
      }
    })

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
  try {
    await db.fileEditLog.create({
      data: {
        objectKey,
        editorUserId: userId,
        editorEmail: userEmail,
        editorName: userName,
        action,
        sessionId: sessionId || null,
        details: details ? JSON.stringify(details) : null,
        timestamp: new Date()
      }
    })
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
  try {
    const lastLog = await db.fileEditLog.findFirst({
      where: {
        objectKey,
        action: {
          in: ['synced', 'force_overwrite']
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        editorEmail: true,
        editorName: true,
        action: true,
        timestamp: true
      }
    })

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
  try {
    await expireStaleSessions()

    const session = await db.fileEditSession.findFirst({
      where: {
        objectKey,
        editorUserId: userId,
        status: 'active',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    return (session as EditSession) || null
  } catch (error) {
    console.warn('⚠️ [FileLock] Failed to get active session:', error)
    return null
  }
}

/**
 * Extend session expiry (refresh the lock)
 */
export async function extendSession(sessionId: string): Promise<EditSession | null> {
  try {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)

    const session = await db.fileEditSession.update({
      where: { id: sessionId },
      data: {
        expiresAt: newExpiresAt,
        updatedAt: new Date()
      }
    })

    return session as EditSession
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
