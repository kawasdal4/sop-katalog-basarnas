import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET - Fetch all SOPs with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const kategori = searchParams.get('kategori') || ''
    const jenis = searchParams.get('jenis') || ''
    const status = searchParams.get('status') || ''
    const tahun = searchParams.get('tahun') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const verificationStatus = searchParams.get('verificationStatus') || ''
    const publicOnly = searchParams.get('publicOnly') === 'true'
    
    const where: Record<string, unknown> = {}
    
    if (search) {
      where.OR = [
        { nomorSop: { contains: search } },
        { judul: { contains: search } }
      ]
    }
    if (kategori) where.kategori = kategori
    if (jenis) where.jenis = jenis
    if (status) where.status = status
    if (tahun) where.tahun = parseInt(tahun)
    
    // Filter for public submissions only
    if (publicOnly) {
      where.isPublicSubmission = true
      if (verificationStatus) {
        where.verificationStatus = verificationStatus
      }
    } else {
      // If no verification status specified, exclude pending public submissions from main catalog
      if (!verificationStatus) {
        where.OR = [
          { isPublicSubmission: false },
          { verificationStatus: 'DISETUJUI' }
        ]
      } else {
        where.verificationStatus = verificationStatus
      }
    }
    
    const total = await db.sopFile.count({ where })
    
    const sopFiles = await db.sopFile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
    
    return NextResponse.json({ 
      data: sopFiles, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Fetch SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST - Create new SOP
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const judul = formData.get('judul') as string
    const kategori = formData.get('kategori') as string
    const jenis = formData.get('jenis') as string
    const tahun = parseInt(formData.get('tahun') as string)
    const status = formData.get('status') as string
    const file = formData.get('file') as File | null
    
    // Public submission fields
    const isPublicSubmission = formData.get('isPublicSubmission') === 'true'
    const submitterName = formData.get('submitterName') as string | null
    const submitterEmail = formData.get('submitterEmail') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'File diperlukan' }, { status: 400 })
    }
    
    // For public submissions, we need to get or create a system user
    let userId: string
    
    if (isPublicSubmission) {
      // Get or create system user for public submissions
      let systemUser = await db.user.findUnique({ where: { email: 'system@sop.go.id' } })
      if (!systemUser) {
        systemUser = await db.user.create({
          data: {
            email: 'system@sop.go.id',
            password: 'system',
            name: 'System (Public Submission)',
            role: 'STAF'
          }
        })
      }
      userId = systemUser.id
    } else {
      // For admin uploads, require authentication
      const cookieStore = await cookies()
      const sessionUserId = cookieStore.get('userId')?.value
      
      if (!sessionUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = sessionUserId
    }
    
    // Generate nomor SOP
    const counter = await db.counter.findUnique({ where: { id: 'counter' } })
    const count = jenis === 'SOP' ? (counter?.sopCount || 0) + 1 : (counter?.ikCount || 0) + 1
    const nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
    
    // Save file
    const uploadDir = path.join(process.cwd(), 'uploads')
    await mkdir(uploadDir, { recursive: true })
    
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const fileName = `${nomorSop}.${fileExtension}`
    const filePath = path.join(uploadDir, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Create SOP record
    const sopFile = await db.sopFile.create({
      data: {
        nomorSop,
        judul,
        tahun,
        kategori,
        jenis,
        status: status || 'AKTIF',
        fileName: file.name,
        filePath: fileName,
        fileType: fileExtension,
        uploadedBy: userId,
        isPublicSubmission,
        submitterName,
        submitterEmail,
        verificationStatus: isPublicSubmission ? 'MENUNGGU' : null
      }
    })
    
    // Update counter
    if (jenis === 'SOP') {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { sopCount: count },
        create: { id: 'counter', sopCount: count, ikCount: 0 }
      })
    } else {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { ikCount: count },
        create: { id: 'counter', sopCount: 0, ikCount: count }
      })
    }
    
    // Create log
    await db.log.create({
      data: {
        userId,
        aktivitas: 'UPLOAD',
        deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${nomorSop} - ${judul}${isPublicSubmission ? ` (${submitterName})` : ''}`,
        fileId: sopFile.id
      }
    })
    
    return NextResponse.json({ success: true, data: sopFile })
  } catch (error) {
    console.error('Create SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// PUT - Update SOP status
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, status, verificationStatus, verifiedBy } = body
    
    const updateData: Record<string, unknown> = {}
    
    if (status) updateData.status = status
    if (verificationStatus) {
      updateData.verificationStatus = verificationStatus
      updateData.verifiedBy = verifiedBy || userId
      updateData.verifiedAt = new Date()
    }
    
    const sopFile = await db.sopFile.update({
      where: { id },
      data: updateData
    })
    
    // Create log
    const user = await db.user.findUnique({ where: { id: userId } })
    await db.log.create({
      data: {
        userId,
        aktivitas: verificationStatus ? 'VERIFIKASI' : 'EDIT_STATUS',
        deskripsi: `${user?.name} ${verificationStatus ? 'memverifikasi' : 'mengubah status'} ${sopFile.jenis}: ${sopFile.nomorSop}`,
        fileId: id
      }
    })
    
    return NextResponse.json({ success: true, data: sopFile })
  } catch (error) {
    console.error('Update SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE - Delete SOP
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    await db.sopFile.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
