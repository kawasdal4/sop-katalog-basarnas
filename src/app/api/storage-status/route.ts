import { NextResponse } from 'next/server'

// Get storage status
export async function GET() {
  try {
    // Check authentication method
    const hasOAuth2 = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    )
    
    const hasServiceAccount = !!(
      process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    )
    
    const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID
    
    // Determine auth method
    const authMethod = hasOAuth2 ? 'oauth2' : hasServiceAccount ? 'service-account' : 'none'
    
    if (!hasFolderId) {
      return NextResponse.json({
        mode: 'local',
        message: 'Menyimpan file di server lokal',
        driveConfigured: false,
        driveWorking: false,
        authMethod: 'none'
      })
    }
    
    // Test Google Drive connection
    try {
      const gd = await import('@/lib/google-drive')
      const testResult = await gd.testDriveConnection()
      
      return NextResponse.json({
        mode: testResult.success ? 'drive' : 'local',
        message: testResult.success 
          ? `Terhubung ke Google Drive (${authMethod === 'oauth2' ? 'OAuth2' : 'Service Account'})` 
          : 'Menggunakan penyimpanan lokal (Google Drive tidak tersedia)',
        driveConfigured: true,
        driveWorking: testResult.success,
        authMethod: authMethod,
        details: testResult.details,
        setupInstructions: !hasOAuth2 ? {
          title: 'Setup OAuth2 untuk Personal Gmail',
          steps: [
            '1. Buka https://console.cloud.google.com/apis/credentials',
            '2. Klik "Create Credentials" > "OAuth client ID"',
            '3. Pilih "Web application"',
            '4. Tambahkan redirect URI: http://localhost:8080/callback',
            '5. Copy Client ID dan Client Secret ke .env',
            '6. Jalankan: bun run setup:oauth',
            '7. Copy refresh token ke .env',
          ]
        } : undefined
      })
    } catch (error) {
      return NextResponse.json({
        mode: 'local',
        message: 'Menggunakan penyimpanan lokal',
        driveConfigured: hasOAuth2 || hasServiceAccount,
        driveWorking: false,
        authMethod: authMethod,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } catch (error) {
    return NextResponse.json({
      mode: 'local',
      message: 'Menggunakan penyimpanan lokal',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
