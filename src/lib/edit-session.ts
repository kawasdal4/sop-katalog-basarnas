/**
 * Edit Session Management for Desktop Excel Edit
 * 
 * Uses JWT for session storage (stateless, no database required)
 * Session contains: objectKey, originalFileName, originalHash, timestampEditStart
 */

import { SignJWT, jwtVerify } from 'jose'

// Session secret - should be in environment variables
const SESSION_SECRET = process.env.EDIT_SESSION_SECRET || 'your-secret-key-change-in-production'
const SESSION_EXPIRY_MINUTES = 30

// Convert secret to Uint8Array for jose
const getSecretKey = () => new TextEncoder().encode(SESSION_SECRET)

export interface EditSession {
  objectKey: string
  originalFileName: string
  originalHash: string
  timestampEditStart: number
  fileId?: string
}

/**
 * Create a new edit session JWT
 */
export async function createEditSession(
  objectKey: string,
  originalFileName: string,
  originalHash: string,
  fileId?: string
): Promise<string> {
  const session: EditSession = {
    objectKey,
    originalFileName,
    originalHash,
    timestampEditStart: Date.now(),
    fileId,
  }

  const token = await new SignJWT({ session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_MINUTES}m`)
    .sign(getSecretKey())

  return token
}

/**
 * Verify and decode edit session JWT
 * Returns null if invalid or expired
 */
export async function verifyEditSession(token: string): Promise<EditSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    
    if (!payload.session || typeof payload.session !== 'object') {
      return null
    }

    const session = payload.session as EditSession

    // Additional expiry check (belt and suspenders)
    const elapsedMinutes = (Date.now() - session.timestampEditStart) / (1000 * 60)
    if (elapsedMinutes > SESSION_EXPIRY_MINUTES) {
      return null
    }

    return session
  } catch (error) {
    console.error('Session verification failed:', error)
    return null
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: EditSession): boolean {
  const elapsedMinutes = (Date.now() - session.timestampEditStart) / (1000 * 60)
  return elapsedMinutes > SESSION_EXPIRY_MINUTES
}

/**
 * Get remaining time in minutes
 */
export function getSessionRemainingTime(session: EditSession): number {
  const elapsedMinutes = (Date.now() - session.timestampEditStart) / (1000 * 60)
  return Math.max(0, SESSION_EXPIRY_MINUTES - elapsedMinutes)
}
