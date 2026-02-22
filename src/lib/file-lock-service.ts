/**
 * File Lock Service
 * 
 * Handles file locking, session management, and conflict detection
 * for the Desktop Excel Edit + Sync system.
 */

import { db } from '@/lib/db'
import { createHash } from 'crypto'

// Constants
export const SESSION_DURATION_MINUTES = 30

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
  const now = new Date()
  
  const result = await db.fileEditSession.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: now }
    },
    data: {
      status: 'expired'
    }
  })

  // Log expired sessions
  if (result.count > 0) {
    const expiredSessions = await db.fileEditSession.findMany({
      where: {
        status: 'expired',
        expiresAt: { lt: now }
      }
    })

    for (const session of expiredSessions) {
      await logEditAction(
        session.objectKey,
        session.editorUserId,
        session.editorEmail,
        session.editorName,
        'expired',
        session.id,
        { reason: 'auto_expired', expiresAt: session.expiresAt }
      )
    }
    
    console.log(`🔒 [FileLock] Expired ${result.count} stale sessions`)
  }

  return result.count
}

/**
 * Check if a file is locked by another user
 */
export async function checkFileLock(
  objectKey: string,
  currentUserId: string
): Promise<LockCheckResult> {
  // First, expire any stale sessions
  await expireStaleSessions()

  // Find active session for this object
  const activeSession = await db.fileEditSession.findFirst({
    where: {
      objectKey,
      status: 'active',
      expiresAt: { gt: new Date() }
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

  // Create session
  const session = await db.fileEditSession.create({
    data: {
      objectKey,
      sopFileId,
      editorUserId: userId,
      editorEmail: userEmail,
      editorName: userName,
      originalHash,
      lockedAt: now,
      expiresAt,
      status: 'active'
    }
  })

  // Log the start
  await logEditAction(
    objectKey,
    userId,
    userEmail,
    userName,
    'started',
    session.id,
    { sopFileId, originalHash: originalHash.slice(0, 16) + '...' }
  )

  console.log(`🔒 [FileLock] Session created: ${session.id} for ${objectKey} by ${userEmail}`)

  return session
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
    // Update status if not already
    if (session.status !== 'expired') {
      await db.fileEditSession.update({
        where: { id: sessionId },
        data: { status: 'expired' }
      })
      
      await logEditAction(
        session.objectKey,
        session.editorUserId,
        session.editorEmail,
        session.editorName,
        'expired',
        sessionId,
        { reason: 'session_expired_during_sync' }
      )
    }
    
    return {
      valid: false,
      error: 'Sesi sudah kadaluarsa (lebih dari 30 menit)'
    }
  }

  // Check for conflicts (hash changed in R2)
  const hasConflict = session.originalHash !== currentR2Hash

  // Get last editor info from logs
  const lastSyncLog = await db.fileEditLog.findFirst({
    where: {
      objectKey: session.objectKey,
      action: 'synced',
      timestamp: { gt: session.lockedAt }
    },
    orderBy: { timestamp: 'desc' }
  })

  if (hasConflict) {
    return {
      valid: true,
      session: session as EditSession,
      conflict: {
        hasConflict: true,
        originalHash: session.originalHash,
        currentHash: currentR2Hash,
        message: 'File telah diperbarui oleh user lain sejak Anda mulai edit. Pilih "Force Overwrite" untuk menimpa atau "Cancel" untuk membatalkan.',
        lastEditor: lastSyncLog ? {
          email: lastSyncLog.editorEmail,
          name: lastSyncLog.editorName,
          syncedAt: lastSyncLog.timestamp
        } : undefined
      }
    }
  }

  return {
    valid: true,
    session: session as EditSession
  }
}

/**
 * Complete a session (successful sync)
 */
export async function completeSession(
  sessionId: string,
  newHash: string
): Promise<void> {
  const now = new Date()

  await db.fileEditSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      completedAt: now,
      lastSyncedAt: now
    }
  })

  // Get session info for logging
  const session = await db.fileEditSession.findUnique({
    where: { id: sessionId }
  })

  if (session) {
    await logEditAction(
      session.objectKey,
      session.editorUserId,
      session.editorEmail,
      session.editorName,
      'synced',
      sessionId,
      { newHash: newHash.slice(0, 16) + '...' }
    )
  }

  console.log(`✅ [FileLock] Session completed: ${sessionId}`)
}

/**
 * Force complete session (force overwrite)
 */
export async function forceCompleteSession(
  sessionId: string,
  newHash: string
): Promise<void> {
  const now = new Date()

  await db.fileEditSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      completedAt: now,
      lastSyncedAt: now
    }
  })

  // Get session info for logging
  const session = await db.fileEditSession.findUnique({
    where: { id: sessionId }
  })

  if (session) {
    await logEditAction(
      session.objectKey,
      session.editorUserId,
      session.editorEmail,
      session.editorName,
      'force_overwrite',
      sessionId,
      { 
        originalHash: session.originalHash.slice(0, 16) + '...',
        newHash: newHash.slice(0, 16) + '...',
        reason: 'conflict_force_resolved'
      }
    )
  }

  console.log(`⚠️ [FileLock] Session force completed: ${sessionId}`)
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string): Promise<void> {
  const session = await db.fileEditSession.findUnique({
    where: { id: sessionId }
  })

  if (session) {
    await db.fileEditSession.update({
      where: { id: sessionId },
      data: { status: 'completed' }
    })

    await logEditAction(
      session.objectKey,
      session.editorUserId,
      session.editorEmail,
      session.editorName,
      'cancelled',
      sessionId,
      { reason: 'user_cancelled' }
    )

    console.log(`🚫 [FileLock] Session cancelled: ${sessionId}`)
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
  await db.fileEditLog.create({
    data: {
      objectKey,
      editorUserId: userId,
      editorEmail: userEmail,
      editorName: userName,
      action,
      sessionId: sessionId || null,
      details: details ? JSON.stringify(details) : null
    }
  })
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
  const lastLog = await db.fileEditLog.findFirst({
    where: {
      objectKey,
      action: { in: ['synced', 'force_overwrite'] }
    },
    orderBy: { timestamp: 'desc' }
  })

  if (!lastLog) return null

  return {
    email: lastLog.editorEmail,
    name: lastLog.editorName,
    action: lastLog.action,
    timestamp: lastLog.timestamp
  }
}

/**
 * Get active session for user
 */
export async function getActiveSessionForUser(
  objectKey: string,
  userId: string
): Promise<EditSession | null> {
  await expireStaleSessions()

  return db.fileEditSession.findFirst({
    where: {
      objectKey,
      editorUserId: userId,
      status: 'active',
      expiresAt: { gt: new Date() }
    }
  }) as Promise<EditSession | null>
}

/**
 * Extend session expiry (refresh the lock)
 */
export async function extendSession(sessionId: string): Promise<EditSession | null> {
  const session = await db.fileEditSession.findUnique({
    where: { id: sessionId }
  })

  if (!session || session.status !== 'active') return null

  const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)

  return db.fileEditSession.update({
    where: { id: sessionId },
    data: { expiresAt: newExpiresAt }
  }) as Promise<EditSession | null>
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
