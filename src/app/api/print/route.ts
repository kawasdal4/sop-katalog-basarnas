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

// GET - Get print-ready file (proxy through API to avoid CORS)
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
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File path not available' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop()
    
    // Only PDF files are supported for print in production
    if (fileExtension !== 'pdf') {
      return NextResponse.json({ 
        error: 'Hanya file PDF yang bisa di-print langsung. Untuk file Excel/Word, silakan download dan print dari aplikasi desktop.',
        fileType: fileExtension 
      }, { status: 400 })
    }
    
    // Download PDF from R2
    const r2Response = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sopFile.filePath,
    }))
    
    if (!r2Response.Body) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })
    }
    
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    
    // Log print activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'PRINT_FILE',
          deskripsi: `Printed PDF: ${sopFile.nomorSop} - ${sopFile.judul}`,
          fileId: sopFile.id,
        },
      })
    } catch {}
    
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
      error: 'Failed to prepare file for printing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
