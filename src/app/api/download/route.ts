import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// GET - Download file (redirect to Google Drive)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({ where: { id } })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    // If file is in Google Drive, redirect to direct download URL
    if (sopFile.driveFileId) {
      const directUrl = `https://drive.google.com/uc?export=download&id=${sopFile.driveFileId}`
      return NextResponse.redirect(directUrl)
    }
    
    // If no Google Drive ID, return error
    return NextResponse.json({ 
      error: 'File tidak tersedia untuk diunduh. File belum diupload ke Google Drive.',
      fileName: sopFile.fileName
    }, { status: 404 })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
