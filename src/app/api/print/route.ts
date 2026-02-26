import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Helper function to check if filePath is an R2 key
function isR2Key(path: string | null): boolean {
  if (!path) return false
  return path.includes('/') || path.startsWith('sop-files')
}

// GET - Get print-ready PDF file from R2
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File path tidak tersedia' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop()
    
    // Only PDF files are supported for direct printing
    if (fileExtension !== 'pdf') {
      return NextResponse.json({ 
        error: 'Hanya file PDF yang bisa di-print langsung',
        fileType: fileExtension 
      }, { status: 400 })
    }
    
    let fileBuffer: Buffer | null = null
    
    // Download PDF from R2
    if (isR2Key(sopFile.filePath)) {
      try {
        console.log(`🖨️ [Print] Downloading from R2: ${sopFile.filePath}`)
        const r2Response = await r2Client.send(new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: sopFile.filePath,
        }))
        
        if (r2Response.Body) {
          fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
          console.log(`✅ [Print] Got ${fileBuffer.length} bytes from R2`)
        }
      } catch (r2Error) {
        console.error('❌ [Print] R2 error:', r2Error)
        fileBuffer = null
      }
    }
    
    if (!fileBuffer) {
      return NextResponse.json({ 
        error: 'File tidak ditemukan di R2 storage',
        details: 'Pastikan file sudah di-sync ke R2'
      }, { status: 404 })
    }
    
    // Log print activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'PRINT',
          deskripsi: `Print PDF: ${sopFile.nomorSop} - ${sopFile.judul}`,
          fileId: sopFile.id,
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to log print activity:', logError)
    }
    
    // Return PDF with CORS headers for print dialog
    const sanitizedFileName = sopFile.fileName.replace(/[^\w\-.]/g, '_')
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${sanitizedFileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({
      error: 'Gagal mempersiapkan file untuk print',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
