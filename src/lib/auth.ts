import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return null
    }
    
    const session = JSON.parse(sessionData)
    return session as SessionUser
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
