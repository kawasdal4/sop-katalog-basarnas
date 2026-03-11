import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// API endpoint that Tauri's auto-updater calls to check for updates.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const currentVersion = searchParams.get('version') // Optional: The client's current version
    const platform = searchParams.get('target') // Optional: OS platform (windows, darwin, linux)
    const arch = searchParams.get('arch') // Optional: x86_64, aarch64

    console.log(`[UpdateCheck] Version: ${currentVersion}, Platform: ${platform}, Arch: ${arch}`)

    // Fetch the latest published and mandatory release from the database
    // Or just the latest published release if we want to let the client decide
    const latestRelease = await db.desktopRelease.findFirst({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: 'desc', // Assuming newer creation dates mean newer versions for simplicity
      },
    })

    if (!latestRelease) {
      // Return 204 No Content to indicate no updates are available
      console.log('[UpdateCheck] No published releases found.')
      return new NextResponse(null, { status: 204 })
    }

    // Tauri expects a specific JSON format for the update response:
    // https://tauri.app/v1/guides/distribution/updater/#update-server-json-format
    // Note: This response format must strictly match what Tauri v2 expects.
    const updateResponse = {
      version: latestRelease.version,
      notes: latestRelease.notes || 'Pembaruan aplikasi E-Katalog SOP telah tersedia.',
      pub_date: latestRelease.pubDate.toISOString(),
      platforms: {
        // Tauri v2 allows specifying platforms. We are primarily targeting Windows.
        // The platform string matcher in Tauri can be tricky, so we provide default fallbacks
        // for common Windows identifiers.
        'windows-x86_64': {
          url: latestRelease.downloadUrl,
          signature: latestRelease.signature,
        },
        'windows-i686': {
          url: latestRelease.downloadUrl,
          signature: latestRelease.signature,
        },
        // For fallback if the exact target isn't explicitly matched but updater is running
        'win64': {
          url: latestRelease.downloadUrl,
          signature: latestRelease.signature,
        },
        'win32': {
           url: latestRelease.downloadUrl,
          signature: latestRelease.signature,
        }
      },
    }

    // Optional Semver check: If client sends current version, and it matches latest, return 204.
    // In many cases, it's safer to let the Tauri client perform the semver check.
    if (currentVersion === latestRelease.version) {
      console.log(`[UpdateCheck] Client is already on the latest version (${currentVersion}).`)
      return new NextResponse(null, { status: 204 })
    }

    console.log(`[UpdateCheck] Update available: version ${latestRelease.version}`)
    return NextResponse.json(updateResponse)
    
  } catch (error) {
    console.error('[UpdateCheck] Error checking for desktop update:', error)
    return NextResponse.json({ error: 'Internal server error while checking for updates' }, { status: 500 })
  }
}
