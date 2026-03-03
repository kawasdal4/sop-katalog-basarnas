import { NextRequest, NextResponse } from 'next/server'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'

/**
 * GET /api/users/photo?key={imageKey}
 * 
 * Proxy endpoint to serve profile photos from R2 when public URL is not available
 */
export async function GET(request: NextRequest) {
    try {
        const key = request.nextUrl.searchParams.get('key')

        if (!key) {
            return NextResponse.json({ error: 'Image key missing' }, { status: 400 })
        }

        // Check R2 configuration
        if (!isR2Configured()) {
            return NextResponse.json({ error: 'R2 storage not configured' }, { status: 500 })
        }

        try {
            console.log(`[Photo Proxy] Attempting to download photo with key: "${key}"`);
            // Download image from R2
            const result = await downloadFromR2(key)
            console.log(`[Photo Proxy] Successfully downloaded photo. ContentType: ${result.contentType}, Length: ${result.buffer.length}`);
            const imageBuffer = result.buffer
            const contentType = result.contentType || 'image/jpeg'

            // Determine max-age for caching (1 hour)
            const maxAge = 60 * 60

            return new NextResponse(new Uint8Array(imageBuffer), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': imageBuffer.length.toString(),
                    'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=600`,
                },
            })
        } catch (e: any) {
            console.error(`[Photo Proxy] Error fetching image "${key}":`, {
                message: e.message,
                code: e.Code || e.name,
                stack: e.stack
            })
            return NextResponse.json({
                error: 'Image not found or accessible',
                details: e.message,
                code: e.Code || e.name
            }, { status: 404 })
        }

    } catch (error) {
        console.error('[Photo Proxy] Error:', error)
        return NextResponse.json({
            error: 'Error loading photo',
        }, { status: 500 })
    }
}
