import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Initialize the system with default admin user
export async function GET() {
  try {
    // Check if admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (existingAdmin) {
      return NextResponse.json({ 
        message: 'Admin sudah ada',
        admin: { email: existingAdmin.email, name: existingAdmin.name }
      })
    }
    
    // Create default admin
    const admin = await db.user.create({
      data: {
        email: 'admin@sop.go.id',
        password: 'admin123',
        name: 'Administrator',
        role: 'ADMIN'
      }
    })
    
    // Initialize counter
    await db.counter.upsert({
      where: { id: 'counter' },
      update: {},
      create: { id: 'counter', sopCount: 0, ikCount: 0 }
    })
    
    return NextResponse.json({ 
      message: 'Admin berhasil dibuat',
      admin: { email: admin.email, name: admin.name }
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
