import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadToR2 } from '@/lib/r2-storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    const version = formData.get('version') as string
    const notes = formData.get('notes') as string
    const file = formData.get('file') as File | null
    const signature = formData.get('signature') as string // The .sig contents
    
    if (!version || !notes || !file || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Upload the installer file to R2
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const objectKey = `desktop-releases/${version}/E-Katalog-SOP-setup.exe`
    const mimeType = 'application/x-msdownload'
    
    let downloadUrl = ''
    try {
        const result = await uploadToR2(fileBuffer, file.name, mimeType, { key: objectKey })
        downloadUrl = result.publicUrl || result.url
    } catch (e) {
        console.error("R2 Upload failed:", e)
        return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
    }

    // 2. Save the release metadata to the database
    const release = await db.desktopRelease.create({
      data: {
        version,
        notes,
        signature,
        downloadUrl: downloadUrl || objectKey, // Fallback to key if URL gen fails
        fileSize: file.size,
        isPublished: true, // Auto-publish for now
        isMandatory: false
      }
    })

    return NextResponse.json({ success: true, release })

  } catch (error) {
    console.error('[AdminRelease] Error creating release:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
    try {
        const releases = await db.desktopRelease.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(releases)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 })
    }
}
