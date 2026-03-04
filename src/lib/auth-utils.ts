import { createClient } from './supabase/server'
import { db } from './db'

export async function getSession() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

export async function getUserRole(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })
    return user?.role
}

export async function validateRole(allowedRoles: string[]) {
    const session = await getSession()
    if (!session) return { authenticated: false, authorized: false }

    const role = await getUserRole(session.user.id)
    if (!role || !allowedRoles.includes(role)) {
        return { authenticated: true, authorized: false, user: session.user, role }
    }

    return { authenticated: true, authorized: true, user: session.user, role }
}
