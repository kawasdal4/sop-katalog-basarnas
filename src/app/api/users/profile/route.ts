import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { uploadToR2, deleteFromR2, getR2PublicUrl } from '@/lib/r2-storage'

// User Profile API - GET for fetching profile, PUT for updating
// GET - Get current user profile
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user without select to avoid Turbopack cache issues
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Get profile photo URL if exists
    // Use any cast to avoid type errors if Prisma client is not yet updated
    const userAny = user as any
    let profilePhotoUrl: string | null = null
    if (userAny.profilePhoto) {
      const cacheBuster = user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()
      if (userAny.profilePhoto.toString().startsWith('http')) {
        profilePhotoUrl = userAny.profilePhoto
      } else {
        // Always use proxy for better reliability and to handle private buckets/CORS
        profilePhotoUrl = `/api/users/photo?key=${encodeURIComponent(userAny.profilePhoto)}&v=${cacheBuster}`
      }
    }

    console.log('[Profile GET] Data fetched:', {
      userId: user.id,
      hasPhoto: !!user.profilePhoto,
      profilePhotoUrl
    })

    // Return only the fields we need (excluding password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profilePhoto: userAny.profilePhoto,
      profilePhotoUrl,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// PUT - Update user profile (name, email, photo)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    const userAny = user as any
    const formData = await request.formData()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const photo = formData.get('photo') as File | null
    const removePhoto = formData.get('removePhoto') === 'true'

    console.log('[Profile API] Update request:', {
      hasName: !!name,
      hasEmail: !!email,
      hasPhoto: !!photo,
      photoSize: photo?.size,
      photoType: photo?.type,
      removePhoto
    })

    const updateData: Record<string, unknown> = {}

    // Update name if provided
    if (name && name !== user.name) {
      if (name.trim().length < 2) {
        return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    // Update email if provided
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
      }

      // Check if email already used by another user
      const existingUser = await db.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json({ error: 'Email sudah digunakan oleh user lain' }, { status: 400 })
      }

      updateData.email = email
    }

    // Handle profile photo
    if (removePhoto && userAny.profilePhoto) {
      // Delete old photo from R2
      try {
        console.log('[Profile API] Deleting old photo:', userAny.profilePhoto)
        await deleteFromR2(userAny.profilePhoto as string)
        console.log('[Profile API] Old photo deleted successfully')
      } catch (e) {
        console.error('[Profile API] Failed to delete old profile photo (non-fatal):', e)
      }
      updateData.profilePhoto = null
    } else if (photo && photo.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(photo.type)) {
        return NextResponse.json({ error: 'Format foto tidak didukung. Gunakan JPG, PNG, GIF, atau WebP' }, { status: 400 })
      }

      // Validate file size (max 5MB for cropped images)
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Ukuran foto maksimal 5MB' }, { status: 400 })
      }

      // Delete old photo if exists
      if (userAny.profilePhoto) {
        try {
          console.log('[Profile API] Deleting existing photo before replacement:', userAny.profilePhoto)
          await deleteFromR2(userAny.profilePhoto as string)
        } catch (e) {
          console.error('[Profile API] Failed to delete old profile photo (non-fatal):', e)
        }
      }

      // Upload new photo
      try {
        const photoBuffer = Buffer.from(await photo.arrayBuffer())
        const fileExt = photo.name.split('.').pop() || 'jpg'
        const photoKey = `profile-photos/${userId}-${Date.now()}.${fileExt}`
        const contentType = photo.type || 'image/jpeg'

        console.log('[Profile API] Starting R2 upload:', {
          photoKey,
          bufferSize: photoBuffer.length,
          contentType
        })

        // Pass photoKey as options.key to ensure it's uploaded exactly where we expect
        const uploadResult = await uploadToR2(photoBuffer, photo.name, contentType, { key: photoKey })

        console.log('[Profile API] R2 upload successful')
        updateData.profilePhoto = photoKey
      } catch (uploadError) {
        console.error('[Profile API] R2 upload FAILED:', uploadError)
        return NextResponse.json({
          error: 'Gagal mengunggah foto ke penyimpanan awan',
          details: uploadError instanceof Error ? uploadError.message : String(uploadError)
        }, { status: 500 })
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      console.log('[Profile API] No changes to update')
      return NextResponse.json({ message: 'Tidak ada perubahan' })
    }

    // Update using Prisma's update method with any casting to bypass type issues
    try {
      console.log('[Profile API] Executing DB update via Prisma update:', updateData)

      const updatedUser = await (db as any).user.update({
        where: { id: userId },
        data: updateData
      })

      console.log('[Profile API] DB update successful')

      const updatedUserAny = updatedUser as any
      let profilePhotoUrl: string | null = null

      if (updatedUserAny.profilePhoto) {
        const updatedAtTime = updatedUserAny.updatedAt
          ? new Date(updatedUserAny.updatedAt).getTime()
          : Date.now()
        if (updatedUserAny.profilePhoto.startsWith('http')) {
          profilePhotoUrl = updatedUserAny.profilePhoto
        } else {
          // Always use proxy for better reliability
          profilePhotoUrl = `/api/users/photo?key=${encodeURIComponent(updatedUserAny.profilePhoto)}&v=${updatedAtTime}`
        }
      }

      console.log('[Profile API] Update complete final check:', {
        userId: updatedUserAny.id,
        profilePhoto: updatedUserAny.profilePhoto,
        profilePhotoUrl
      })

      return NextResponse.json({
        success: true,
        message: 'Profil berhasil diperbarui',
        user: {
          id: updatedUserAny.id,
          email: updatedUserAny.email,
          name: updatedUserAny.name,
          role: updatedUserAny.role,
          profilePhoto: updatedUserAny.profilePhoto,
          profilePhotoUrl
        }
      })
    } catch (dbError) {
      console.error('[Profile API] DB Update FAILED:', dbError)
      return NextResponse.json({
        error: 'Gagal memperbarui database',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Update profile error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui profil'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
