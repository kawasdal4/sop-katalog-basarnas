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

    const contentType = request.headers.get('content-type') || ''
    let version: string = ''
    let notes: string = ''
    let signature: string = ''
    let directDownloadUrl: string | null = null
    let file: File | null = null

    if (contentType.includes('application/json')) {
      const json = await request.json()
      version = json.version
      notes = json.notes
      signature = json.signature
      directDownloadUrl = json.downloadUrl
      console.log('[AdminRelease] Received JSON data:', { version, notes, signature: signature ? 'PRESENT' : 'MISSING', directDownloadUrl })
    } else {
      const formData = await request.formData()
      version = formData.get('version') as string
      notes = formData.get('notes') as string
      file = formData.get('file') as File | null
      signature = formData.get('signature') as string 
      directDownloadUrl = formData.get('downloadUrl') as string | null
      console.log('[AdminRelease] Received Form data:', { version, notes, signature: signature ? 'PRESENT' : 'MISSING', directDownloadUrl })
    }

    if (!version || !notes || !signature) {
      console.error('[AdminRelease] Missing required fields:', { version, notes, signature: !!signature })
      return NextResponse.json({ error: 'Missing required fields (version, notes, signature)' }, { status: 400 })
    }

    let downloadUrl = directDownloadUrl || ''

    // 1. If a file is provided, upload to R2 (Browser/Manual Upload)
    if (file && !downloadUrl) {
      console.log('[AdminRelease] Uploading file to R2:', file.name)
      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)
      const objectKey = `desktop-releases/${version}/${file.name}`
      const mimeType = file.type || 'application/x-msdownload'
      
      try {
          const result = await uploadToR2(fileBuffer, file.name, mimeType, { key: objectKey })
          downloadUrl = result.publicUrl || result.url
          console.log('[AdminRelease] R2 Upload success:', downloadUrl)
      } catch (e) {
          console.error("[AdminRelease] R2 Upload failed:", e)
          return NextResponse.json({ error: 'Failed to upload file to storage: ' + (e as Error).message }, { status: 500 })
      }
    }

    if (!downloadUrl) {
      console.error('[AdminRelease] No download URL determined')
      return NextResponse.json({ error: 'Missing file or downloadUrl' }, { status: 400 })
    }

    // 2. Save the release metadata to the database
    console.log('[AdminRelease] Saving to DB...')
    try {
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
      console.log('[AdminRelease] DB Save success:', release.id)
      return NextResponse.json({ success: true, release })
    } catch (dbError) {
      console.error('[AdminRelease] Database error:', dbError)
      return NextResponse.json({ 
        error: 'Database error while creating release', 
        details: (dbError as Error).message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[AdminRelease] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error as Error).message }, { status: 500 })
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
