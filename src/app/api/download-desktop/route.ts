import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Use existing prisma instance if in global or create a new one
// Based on typical nextjs prisma setups
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Fetch the latest published desktop release
    const latestRelease = await prisma.desktopRelease.findFirst({
      where: {
        isPublished: true,
      },
      orderBy: {
        pubDate: 'desc',
      },
    })

    if (!latestRelease) {
      return NextResponse.json(
        { error: 'Installer belum dipublikasikan atau tidak tersedia.' },
        { status: 404 }
      )
    }

    // Track the analytics silently
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      let device = 'unknown'
      if (userAgent.includes('Windows')) device = 'Windows'
      else if (userAgent.includes('Mac')) device = 'Mac'
      else if (userAgent.includes('Linux')) device = 'Linux'

      await prisma.desktopDownload.create({
        data: {
          ip,
          device,
          country: request.headers.get('x-vercel-ip-country') || 'unknown',
        }
      })
    } catch (logError) {
      console.error('Failed to trace download analytics:', logError)
    }

    // Redirect the user's browser to the installer file directly
    return NextResponse.redirect(latestRelease.downloadUrl)

  } catch (error) {
    console.error('Download Desktop Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat mengambil path unduhan.' },
      { status: 500 }
    )
  }
}
