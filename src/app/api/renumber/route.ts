import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/renumber
 * 
 * Renumber all existing SOP files based on updatedAt timestamp.
 * Newest file = #1, oldest file = last number.
 * 
 * Request body:
 * - jenis: 'SOP' | 'IK' | 'LAINNYA' | 'ALL' (default: 'ALL')
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya admin yang dapat melakukan renumbering' }, { status: 403 })
    }
    
    const body = await request.json().catch(() => ({}))
    const jenis = body.jenis || 'ALL'
    
    console.log(`🔄 [Renumber] Starting renumbering for jenis: ${jenis}`)
    
    const jenisList = jenis === 'ALL' ? ['SOP', 'IK', 'LAINNYA'] : [jenis]
    const results: { jenis: string; count: number; details: string[] }[] = []
    
    for (const j of jenisList) {
      const prefix = j === 'SOP' ? 'SOP-' : j === 'IK' ? 'IK-' : 'LAINNYA-'
      
      // Get all files of this jenis, ordered by updatedAt DESC (newest first)
      const files = await db.sopFile.findMany({
        where: { jenis: j },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, nomorSop: true, judul: true, updatedAt: true }
      })
      
      if (files.length === 0) {
        results.push({ jenis: j, count: 0, details: ['No files found'] })
        continue
      }
      
      const details: string[] = []
      
      // Renumber each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const newNumber = i + 1
        const newNomorSop = `${prefix}${String(newNumber).padStart(4, '0')}`
        
        if (file.nomorSop !== newNomorSop) {
          try {
            // Use updateMany with a unique identifier check to avoid conflicts
            // First, set a temporary number to avoid unique constraint violations
            const tempNomor = `TEMP-${file.id.slice(0, 8)}`
            
            await db.sopFile.update({
              where: { id: file.id },
              data: { nomorSop: tempNomor }
            })
            
            // Then update to the final number
            await db.sopFile.update({
              where: { id: file.id },
              data: { nomorSop: newNomorSop }
            })
            
            details.push(`${file.nomorSop} → ${newNomorSop}`)
            console.log(`📝 [Renumber] ${file.nomorSop} → ${newNomorSop}`)
          } catch (updateError) {
            console.error(`❌ [Renumber] Failed to update ${file.nomorSop}:`, updateError)
            details.push(`FAILED: ${file.nomorSop} → ${newNomorSop}`)
          }
        } else {
          details.push(`${file.nomorSop} (unchanged)`)
        }
      }
      
      // Update counter
      const count = files.length
      if (j === 'SOP') {
        await db.counter.upsert({
          where: { id: 'counter' },
          update: { sopCount: count },
          create: { id: 'counter', sopCount: count, ikCount: 0 }
        })
      } else if (j === 'IK') {
        await db.counter.upsert({
          where: { id: 'counter' },
          update: { ikCount: count },
          create: { id: 'counter', sopCount: 0, ikCount: count }
        })
      }
      
      results.push({ jenis: j, count, details: details.slice(0, 10) }) // Limit details to first 10
    }
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'RENUMBER',
        deskripsi: `Renumber SOP files for jenis: ${jenis}`
      }
    })
    
    console.log(`✅ [Renumber] Completed for ${jenisList.join(', ')}`)
    
    return NextResponse.json({
      success: true,
      message: 'Renumbering completed successfully',
      results
    })
    
  } catch (error) {
    console.error('[Renumber] Error:', error)
    return NextResponse.json({
      error: 'Failed to renumber files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/renumber
 * 
 * Preview what the renumbering would look like without actually changing anything.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const jenis = searchParams.get('jenis') || 'ALL'
    
    const jenisList = jenis === 'ALL' ? ['SOP', 'IK', 'LAINNYA'] : [jenis]
    const preview: { jenis: string; current: string; new: string; judul: string }[] = []
    
    for (const j of jenisList) {
      const prefix = j === 'SOP' ? 'SOP-' : j === 'IK' ? 'IK-' : 'LAINNYA-'
      
      const files = await db.sopFile.findMany({
        where: { jenis: j },
        orderBy: { updatedAt: 'desc' },
        select: { nomorSop: true, judul: true, updatedAt: true }
      })
      
      files.forEach((file, i) => {
        const newNumber = i + 1
        const newNomorSop = `${prefix}${String(newNumber).padStart(4, '0')}`
        
        preview.push({
          jenis: j,
          current: file.nomorSop,
          new: newNomorSop,
          judul: file.judul.slice(0, 50) + (file.judul.length > 50 ? '...' : '')
        })
      })
    }
    
    return NextResponse.json({
      success: true,
      preview
    })
    
  } catch (error) {
    console.error('[Renumber Preview] Error:', error)
    return NextResponse.json({
      error: 'Failed to preview renumbering',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
