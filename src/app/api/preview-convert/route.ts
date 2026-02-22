import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CLOUDCONVERT_API = 'https://api.cloudconvert.com/v2'

// File types that need conversion to PDF
const CONVERTIBLE_TYPES = ['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt']

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const fileName = searchParams.get('fileName') || 'file'

    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }

    const fileExtension = fileName.toLowerCase().split('.').pop() || ''

    // If not convertible type, return Google Drive view URL
    if (!CONVERTIBLE_TYPES.includes(fileExtension)) {
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/view`,
        method: 'google-drive'
      })
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY
    console.log(`🔑 API Key exists: ${!!apiKey}, length: ${apiKey?.length || 0}`)

    if (!apiKey) {
      console.log('⚠️ No API Key, using Google Drive preview')
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-nokey'
      })
    }

    console.log(`🔄 Converting ${fileName} to PDF using CloudConvert...`)
    console.log(`📁 File ID: ${fileId}`)

    // Import Google Drive module to download file
    const gd = await import('@/lib/google-drive')

    // Step 1: Download file from Google Drive
    console.log('📥 Downloading file from Google Drive...')
    let fileBuffer: Buffer
    try {
      const { buffer } = await gd.downloadFileFromDrive(fileId)
      fileBuffer = buffer
      console.log(`✅ File downloaded: ${fileBuffer.length} bytes`)
    } catch (downloadError) {
      console.error('❌ Failed to download from Google Drive:', downloadError)
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-download-error'
      })
    }

    // Step 2: Create a job with all tasks in one request (import/upload + convert + export/url)
    console.log('🔄 Creating CloudConvert job...')
    const jobRes = await fetch(`${CLOUDCONVERT_API}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-my-file': {
            operation: 'import/upload',
          },
          'convert-my-file': {
            operation: 'convert',
            input: 'import-my-file',
            output_format: 'pdf',
          },
          'export-my-file': {
            operation: 'export/url',
            input: 'convert-my-file',
          },
        },
        tag: `preview-${fileId}`,
      }),
    })

    if (!jobRes.ok) {
      const errText = await jobRes.text()
      console.error('❌ CloudConvert job error:', errText)
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-job-error'
      })
    }

    const jobData = await jobRes.json()
    const jobId = jobData.data.id
    const tasks = jobData.data.tasks

    // Find the import task
    const importTask = tasks.find((t: { name: string }) => t.name === 'import-my-file')
    if (!importTask) {
      console.error('❌ Import task not found')
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-no-import-task'
      })
    }

    const uploadUrl = importTask.result.form.url
    const uploadParameters = importTask.result.form.parameters

    console.log(`✅ Job created: ${jobId}`)
    console.log(`📤 Upload URL: ${uploadUrl}`)

    // Step 3: Upload file to CloudConvert
    console.log('📤 Uploading file to CloudConvert...')
    const formData = new FormData()
    for (const [key, value] of Object.entries(uploadParameters)) {
      formData.append(key, String(value))
    }
    const blob = new Blob([fileBuffer])
    formData.append('file', blob, fileName)

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('❌ CloudConvert upload error:', errText)
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-upload-error'
      })
    }

    console.log('✅ File uploaded to CloudConvert, waiting for conversion...')

    // Step 4: Wait for job to complete (polling)
    let exportUrl: string | null = null
    let attempts = 0
    const maxAttempts = 60 // 60 seconds max

    while (attempts < maxAttempts && !exportUrl) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const statusRes = await fetch(`${CLOUDCONVERT_API}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      const statusData = await statusRes.json()
      const status = statusData.data?.status
      console.log(`⏳ Job status: ${status} (attempt ${attempts + 1})`)

      if (status === 'finished') {
        const tasks = statusData.data?.tasks || []
        console.log('📋 Tasks:', JSON.stringify(tasks.map((t: { name: string; status: string }) => ({ name: t.name, status: t.status })), null, 2))

        for (const task of tasks) {
          if (task.name === 'export-my-file' && task.result?.files?.[0]?.url) {
            exportUrl = task.result.files[0].url
            console.log('🔗 Found export URL')
            break
          }
        }
        break
      } else if (status === 'error') {
        console.error('❌ CloudConvert job failed:', JSON.stringify(statusData, null, 2))
        break
      }

      attempts++
    }

    if (exportUrl) {
      console.log(`✅ PDF ready!`)
      return NextResponse.json({
        success: true,
        previewUrl: exportUrl,
        method: 'cloudconvert-pdf'
      })
    } else {
      console.log('⚠️ CloudConvert timeout, using Google Drive preview')
      return NextResponse.json({
        success: true,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        method: 'google-drive-timeout'
      })
    }

  } catch (error) {
    console.error('❌ Preview convert error:', error)
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    return NextResponse.json({
      success: true,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      method: 'google-drive-exception',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
