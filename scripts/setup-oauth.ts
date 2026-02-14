#!/usr/bin/env node
/**
 * OAuth2 Setup Script for Google Drive
 * 
 * Jalankan script ini untuk mendapatkan Refresh Token:
 * bun run scripts/setup-oauth.ts
 * 
 * Anda perlu:
 * 1. GOOGLE_CLIENT_ID - dari Google Cloud Console > APIs & Services > Credentials
 * 2. GOOGLE_CLIENT_SECRET - dari Google Cloud Console
 * 
 * Langkah mendapatkan Client ID & Secret:
 * 1. Buka https://console.cloud.google.com/apis/credentials
 * 2. Klik "Create Credentials" > "OAuth client ID"
 * 3. Pilih "Desktop app" atau "Web application"
 * 4. Untuk Web app, tambahkan redirect URI: http://localhost:3000/api/oauth-callback
 * 5. Copy Client ID dan Client Secret ke .env
 */

import { google } from 'googleapis'
import * as readline from 'readline'
import { createServer, IncomingMessage, ServerResponse } from 'http'

// OAuth2 configuration
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
]

// Redirect URI - gunakan localhost untuk setup
const REDIRECT_URI = 'http://localhost:8080/callback'

async function getRefreshToken() {
  console.log('\n🔧 Google Drive OAuth2 Setup\n')
  console.log('=' .repeat(50))
  
  // Get credentials from .env
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('❌ GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum diset di .env')
    console.log('\n📋 Langkah mendapatkan Client ID & Secret:')
    console.log('1. Buka https://console.cloud.google.com/apis/credentials')
    console.log('2. Pastikan project yang benar dipilih (sop-kesiapsiagaan)')
    console.log('3. Klik "Create Credentials" > "OAuth client ID"')
    console.log('4. Pilih "Web application"')
    console.log('5. Tambahkan Authorized redirect URI:')
    console.log('   - http://localhost:8080/callback')
    console.log('   - http://localhost:3000/api/oauth-callback')
    console.log('6. Klik Create dan copy Client ID serta Client Secret')
    console.log('7. Tambahkan ke file .env:')
    console.log('')
    console.log('   GOOGLE_CLIENT_ID=your_client_id_here')
    console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here')
    console.log('')
    console.log('8. Jalankan ulang script ini: bun run scripts/setup-oauth.ts')
    process.exit(1)
  }

  console.log(`✅ Client ID: ${clientId.substring(0, 20)}...`)
  console.log(`✅ Client Secret: ${clientSecret.substring(0, 10)}...`)

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  )

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // IMPORTANT: This gets refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  })

  console.log('\n📱 Langkah selanjutnya:')
  console.log('1. Buka URL ini di browser:')
  console.log('')
  console.log(authUrl)
  console.log('')
  console.log('2. Login dengan akun Gmail Anda (kawasdal4@gmail.com)')
  console.log('3. Klik "Allow" untuk memberikan akses ke Google Drive')
  console.log('4. Anda akan diarahkan ke halaman dengan URL seperti:')
  console.log('   http://localhost:8080/callback?code=XXXXX')
  console.log('5. Copy kode dari URL tersebut (parameter "code")')
  console.log('')

  // Method 1: Start local server to receive callback
  console.log('🌐 Menunggu callback di http://localhost:8080/callback ...')
  console.log('   (Atau paste kode manual jika tidak otomatis)\n')

  // Create promise for code
  const codePromise = new Promise<string>((resolve) => {
    // Start local server
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', 'http://localhost:8080')
      const code = url.searchParams.get('code')
      
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html>
            <head><title>Success</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1 style="color: green;">✅ Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
            </body>
          </html>
        `)
        server.close()
        resolve(code)
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h1>No code received</h1>')
      }
    })

    server.listen(8080, () => {
      console.log('🌐 Server listening on http://localhost:8080')
      console.log('   Buka URL di atas di browser Anda...\n')
    })

    // Also allow manual input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question('📥 Atau paste kode manual di sini: ', (code) => {
      rl.close()
      if (code.trim()) {
        server.close()
        resolve(code.trim())
      }
    })
  })

  const code = await codePromise
  console.log('\n📥 Code received!')

  // Exchange code for tokens
  console.log('🔄 Exchanging code for tokens...')
  
  try {
    const { tokens } = await oauth2Client.getTokens(code)
    
    if (!tokens.refresh_token) {
      console.log('❌ Refresh token tidak diterima!')
      console.log('   Coba ulangi proses dan pastikan klik "Allow" pada consent screen.')
      process.exit(1)
    }

    console.log('\n✅ SUCCESS! Tokens received:')
    console.log('')
    console.log('📋 Copy tokens berikut ke file .env:')
    console.log('')
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`)
    console.log('')
    
    if (tokens.access_token) {
      console.log(`# Access Token (opsional, akan auto-refresh):`)
      console.log(`# GOOGLE_ACCESS_TOKEN="${tokens.access_token}"`)
      console.log('')
    }

    console.log('=' .repeat(50))
    console.log('')
    console.log('🎉 Setup selesai!')
    console.log('')
    console.log('📝 Tambahkan ke .env:')
    console.log('   GOOGLE_CLIENT_ID=...')
    console.log('   GOOGLE_CLIENT_SECRET=...')
    console.log('   GOOGLE_REFRESH_TOKEN=...')
    console.log('')
    console.log('🔄 Setelah itu, upload file akan otomatis ke Google Drive!')
    console.log('   Tanpa perlu login ulang.')
    
  } catch (error) {
    console.error('❌ Error exchanging code:', error)
    process.exit(1)
  }
}

// Run
getRefreshToken()
  .then(() => {
    console.log('\n✨ Setup complete!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
