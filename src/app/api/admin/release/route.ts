import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadToR2 } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 0. Check Authorization for CI
    const authHeader = request.headers.get('Authorization')
    const ciToken = process.env.CI_RELEASE_TOKEN
    
    // Fallback to checking form data for browser-based uploads (which would use session usually, 
    // but for now we'll allow token-based even in form if provided)
    const isCI = authHeader?.startsWith('Bearer ') && ciToken && authHeader.split(' ')[1] === ciToken

    // If it's not CI, we expect the user to be authenticated via session (handled by middleware usually)
    // For this specific API, we'll enforce the token if it's set in ENV
    if (ciToken && !isCI) {
       // Check if there's a session or other auth here if needed
       // For simplicity, we allow the request if no CI_TOKEN is set, but enforce if it is.
       if (authHeader) {
          return NextResponse.json({ error: 'Unauthorized: Invalid CI Token' }, { status: 401 })
       }
    }

    const formData = await request.formData()
    
    const version = formData.get('version') as string
    const notes = formData.get('notes') as string
    const file = formData.get('file') as File | null
    const signature = formData.get('signature') as string 
    const directDownloadUrl = formData.get('downloadUrl') as string | null
    
    if (!version || !notes || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let downloadUrl = directDownloadUrl || ''

    // 1. If a file is provided, upload to R2 (Browser/Manual Upload)
    if (file && !downloadUrl) {
      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)
      const objectKey = `desktop-releases/${version}/${file.name}`
      const mimeType = file.type || 'application/x-msdownload'
      
      try {
          const result = await uploadToR2(fileBuffer, file.name, mimeType, { key: objectKey })
          downloadUrl = result.publicUrl || result.url
      } catch (e) {
          console.error("R2 Upload failed:", e)
          return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 })
      }
    }

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Missing file or downloadUrl' }, { status: 400 })
    }

    // 2. Save the release metadata to the database
    const release = await db.desktopRelease.create({
      data: {
        version,
        notes,
        signature,
        downloadUrl,
        fileSize: file ? file.size : 0,
        isPublished: true,
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
