import { cookies } from 'next/headers'
import { db } from './db'

export async function getSession() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) return null

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true }
    })

    if (!user) return null

    return { user }
}

export async function getUserRole(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })
    return user?.role
}

export async function validateRole(allowedRoles: string[]) {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('userId')?.value

        const session = await getSession()
        if (!session) {
            console.log(`[Auth] No session found for userId: ${userId || 'NONE'}`);
            return { authenticated: false, authorized: false, userId }
        }

        const user = session.user
        if (!user.role || !allowedRoles.includes(user.role)) {
            console.log(`[Auth] Role mismatch for user ${user.id}: ${user.role} not in ${allowedRoles.join(',')}`);
            return { authenticated: true, authorized: false, user, role: user.role, userId }
        }

        return { authenticated: true, authorized: true, user, role: user.role, userId }
    } catch (err: any) {
        console.error('[Auth] validateRole CRASH:', err);
        throw err; // Re-throw to hit API catch block
    }
}
