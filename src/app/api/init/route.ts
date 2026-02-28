import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Initialize the system with default admin and developer users
export async function GET() {
  try {
    const results = {
      admin: null as { email: string; name: string } | null,
      developer: null as { email: string; name: string } | null,
      messages: [] as string[]
    }
    
    // Check if admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (existingAdmin) {
      results.admin = { email: existingAdmin.email, name: existingAdmin.name }
      results.messages.push('Admin sudah ada')
    } else {
      // Create default admin
      const admin = await db.user.create({
        data: {
          email: 'admin@sop.go.id',
          password: 'admin123',
          name: 'Administrator',
          role: 'ADMIN'
        }
      })
      results.admin = { email: admin.email, name: admin.name }
      results.messages.push('Admin berhasil dibuat')
    }
    
    // Check if developer exists
    const existingDeveloper = await db.user.findFirst({
      where: { role: 'DEVELOPER' }
    })
    
    if (existingDeveloper) {
      // Update existing developer to ensure correct credentials
      const updatedDev = await db.user.update({
        where: { id: existingDeveloper.id },
        data: {
          email: 'foetainment@gmail.com',
          password: '048965',
          name: 'Foe'
        }
      })
      results.developer = { email: updatedDev.email, name: updatedDev.name }
      results.messages.push('Developer diperbarui')
    } else {
      // Create the one and only developer account
      const developer = await db.user.create({
        data: {
          email: 'foetainment@gmail.com',
          password: '048965',
          name: 'Foe',
          role: 'DEVELOPER'
        }
      })
      results.developer = { email: developer.email, name: developer.name }
      results.messages.push('Developer berhasil dibuat')
    }
    
    return NextResponse.json({ 
      message: results.messages.join('. '),
      admin: results.admin,
      developer: results.developer
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
