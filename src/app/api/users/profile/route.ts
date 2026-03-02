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
    let profilePhotoUrl = null
    if (user.profilePhoto) {
      const r2Url = getR2PublicUrl(user.profilePhoto)
      if (r2Url) {
        // Add cache-busting parameter based on updatedAt
        const cacheBuster = user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()
        profilePhotoUrl = `${r2Url}?v=${cacheBuster}`
      } else {
        // Fallback to the key itself if public URL is not configured
        profilePhotoUrl = user.profilePhoto
      }
    }

    // Return only the fields we need (excluding password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profilePhoto: user.profilePhoto,
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
    if (removePhoto && user.profilePhoto) {
      // Delete old photo from R2
      try {
        await deleteFromR2(user.profilePhoto)
      } catch (e) {
        console.error('Failed to delete old profile photo:', e)
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
      if (user.profilePhoto) {
        try {
          await deleteFromR2(user.profilePhoto)
        } catch (e) {
          console.error('Failed to delete old profile photo:', e)
        }
      }

      // Upload new photo
      const photoBuffer = Buffer.from(await photo.arrayBuffer())
      const fileExt = photo.name.split('.').pop() || 'jpg'
      const photoKey = `profile-photos/${userId}-${Date.now()}.${fileExt}`

      console.log('[Profile API] Uploading photo:', {
        photoKey,
        bufferSize: photoBuffer.length,
        fileType: photo.type
      })

      // Don't pass folder option since photoKey already includes the folder prefix
      await uploadToR2(photoBuffer, photoKey, photo.type)

      console.log('[Profile API] Photo uploaded successfully:', photoKey)
      updateData.profilePhoto = photoKey
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      console.log('[Profile API] No changes to update')
      return NextResponse.json({ message: 'Tidak ada perubahan' })
    }

    // Update without select to avoid Turbopack cache issues
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData
    })

    // Get profile photo URL if exists
    let profilePhotoUrl = null
    if (updatedUser.profilePhoto) {
      const r2Url = getR2PublicUrl(updatedUser.profilePhoto)
      console.log('[Profile API] R2 Public URL result:', { r2Url, profilePhoto: updatedUser.profilePhoto })
      if (r2Url) {
        // Add cache-busting parameter based on updatedAt
        const cacheBuster = updatedUser.updatedAt ? new Date(updatedUser.updatedAt).getTime() : Date.now()
        profilePhotoUrl = `${r2Url}?v=${cacheBuster}`
      } else {
        // Fallback to proxy route
        const cacheBuster = updatedUser.updatedAt ? new Date(updatedUser.updatedAt).getTime() : Date.now()
        profilePhotoUrl = `/api/users/photo?key=${encodeURIComponent(updatedUser.profilePhoto)}&v=${cacheBuster}`
      }
    }

    console.log('[Profile API] Update complete:', {
      userId: updatedUser.id,
      profilePhoto: updatedUser.profilePhoto,
      profilePhotoUrl
    })

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        profilePhoto: updatedUser.profilePhoto,
        profilePhotoUrl
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui profil'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
