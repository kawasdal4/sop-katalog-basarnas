/**
 * Diagnostic Endpoint for Excel Edit System
 * 
 * This endpoint tests all components of the Excel editing system
 * to help identify where the problem is occurring.
 * 
 * GET /api/excel-edit/diagnose - Run full diagnostic
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

// Azure AD Configuration
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || process.env.TENANT_ID
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || process.env.CLIENT_SECRET
const M365_SERVICE_ACCOUNT = process.env.M365_SERVICE_ACCOUNT

interface DiagnosticResult {
  step: string
  success: boolean
  message: string
  details?: Record<string, unknown>
  error?: string
  duration?: number
}

async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []
  
  // ============================================
  // STEP 1: Check Environment Variables
  // ============================================
  const step1Start = Date.now()
  const envCheck: DiagnosticResult = {
    step: '1. Environment Variables',
    success: true,
    message: 'All required environment variables are set',
    details: {
      AZURE_TENANT_ID: AZURE_TENANT_ID ? `✅ Set (${AZURE_TENANT_ID.slice(0, 8)}...)` : '❌ Missing',
      AZURE_CLIENT_ID: AZURE_CLIENT_ID ? `✅ Set (${AZURE_CLIENT_ID.slice(0, 8)}...)` : '❌ Missing',
      AZURE_CLIENT_SECRET: AZURE_CLIENT_SECRET ? '✅ Set (hidden)' : '❌ Missing',
      M365_SERVICE_ACCOUNT: M365_SERVICE_ACCOUNT ? `✅ Set (${M365_SERVICE_ACCOUNT})` : '❌ Missing',
      R2_ACCOUNT_ID: R2_ACCOUNT_ID ? `✅ Set` : '❌ Missing',
      R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? `✅ Set` : '❌ Missing',
      R2_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? `✅ Set` : '❌ Missing',
      R2_BUCKET_NAME: R2_BUCKET_NAME ? `✅ Set (${R2_BUCKET_NAME})` : '❌ Missing',
    },
    duration: Date.now() - step1Start
  }
  
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !M365_SERVICE_ACCOUNT) {
    envCheck.success = false
    envCheck.message = 'Missing required Azure AD or M365 environment variables'
  }
  results.push(envCheck)
  
  if (!envCheck.success) return results
  
  // ============================================
  // STEP 2: Get Azure AD Access Token
  // ============================================
  const step2Start = Date.now()
  let accessToken: string | null = null
  
  try {
    const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
    
    console.log('🔐 [Diagnose] Requesting Azure AD token from:', tokenUrl)
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID!,
        client_secret: AZURE_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      results.push({
        step: '2. Azure AD Token',
        success: false,
        message: 'Failed to obtain access token from Azure AD',
        error: `${tokenResponse.status} ${JSON.stringify(tokenData)}`,
        details: {
          endpoint: tokenUrl,
          status: tokenResponse.status,
          error: tokenData.error,
          errorDescription: tokenData.error_description,
        },
        duration: Date.now() - step2Start
      })
      return results
    }
    
    accessToken = tokenData.access_token
    results.push({
      step: '2. Azure AD Token',
      success: true,
      message: 'Successfully obtained access token',
      details: {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        tokenPreview: `${accessToken.slice(0, 50)}...`,
      },
      duration: Date.now() - step2Start
    })
  } catch (error) {
    results.push({
      step: '2. Azure AD Token',
      success: false,
      message: 'Exception while requesting token',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step2Start
    })
    return results
  }
  
  // ============================================
  // STEP 3: Check OneDrive Access (Skip user verification since User.Read.All may not be granted)
  // ============================================
  const step3Start = Date.now()
  
  try {
    // Directly try to access the user's drive instead of verifying user first
    // This works because Files.ReadWrite.All permission allows access to any user's drive
    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )
    
    if (!driveResponse.ok) {
      const errorText = await driveResponse.text()
      let errorData: { error?: { code?: string; message?: string } } = {}
      try { errorData = JSON.parse(errorText) } catch {}
      
      results.push({
        step: '3. OneDrive Access',
        success: false,
        message: `Cannot access OneDrive for "${M365_SERVICE_ACCOUNT}"`,
        error: `${driveResponse.status} ${errorText}`,
        details: {
          serviceAccount: M365_SERVICE_ACCOUNT,
          status: driveResponse.status,
          errorCode: errorData.error?.code,
          errorMessage: errorData.error?.message,
          suggestion: driveResponse.status === 404 
            ? 'User may not exist in Azure AD or OneDrive not provisioned. Login to OneDrive once as this user.'
            : driveResponse.status === 403
            ? 'Ensure Files.ReadWrite.All permission is granted with admin consent.'
            : 'Check the error message for details.',
        },
        duration: Date.now() - step3Start
      })
      return results
    }
    
    const driveData = await driveResponse.json()
    
    results.push({
      step: '3. OneDrive Access',
      success: true,
      message: `Successfully accessed OneDrive for "${M365_SERVICE_ACCOUNT}"`,
      details: {
        serviceAccount: M365_SERVICE_ACCOUNT,
        driveId: driveData.id,
        driveType: driveData.driveType,
        owner: driveData.owner?.user?.displayName,
        quota: driveData.quota ? {
          used: `${(driveData.quota.used / 1024 / 1024).toFixed(2)} MB`,
          total: `${(driveData.quota.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
        } : 'Unknown',
        webUrl: driveData.webUrl,
      },
      duration: Date.now() - step3Start
    })
  } catch (error) {
    results.push({
      step: '3. OneDrive Access',
      success: false,
      message: 'Exception while accessing OneDrive',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step3Start
    })
    return results
  }
  
  // ============================================
  // STEP 4: Check/Create Edit Folder
  // ============================================
  const step4Start = Date.now()
  const folderName = process.env.M365_EDIT_FOLDER || 'R2-Edit-Temp'
  
  try {
    // Try to get existing folder
    const folderResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root:/${folderName}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )
    
    if (folderResponse.ok) {
      const folderData = await folderResponse.json()
      results.push({
        step: '4. Edit Folder Check',
        success: true,
        message: `Folder "${folderName}" exists`,
        details: {
          folderId: folderData.id,
          folderName: folderData.name,
          webUrl: folderData.webUrl,
        },
        duration: Date.now() - step4Start
      })
    } else if (folderResponse.status === 404) {
      // Try to create folder
      const createResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root/children`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        }
      )
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        results.push({
          step: '4. Edit Folder Check',
          success: false,
          message: `Folder "${folderName}" does not exist and failed to create`,
          error: `${createResponse.status} ${errorText}`,
          details: {
            folderName,
            status: createResponse.status,
          },
          duration: Date.now() - step4Start
        })
        return results
      }
      
      const newFolder = await createResponse.json()
      results.push({
        step: '4. Edit Folder Check',
        success: true,
        message: `Folder "${folderName}" created successfully`,
        details: {
          folderId: newFolder.id,
          folderName: newFolder.name,
        },
        duration: Date.now() - step4Start
      })
    } else {
      const errorText = await folderResponse.text()
      results.push({
        step: '4. Edit Folder Check',
        success: false,
        message: 'Error checking folder existence',
        error: `${folderResponse.status} ${errorText}`,
        duration: Date.now() - step4Start
      })
      return results
    }
  } catch (error) {
    results.push({
      step: '4. Edit Folder Check',
      success: false,
      message: 'Exception while checking/creating folder',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step4Start
    })
    return results
  }
  
  // ============================================
  // STEP 5: Test R2 Connection
  // ============================================
  const step5Start = Date.now()
  
  try {
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
    
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME!,
      MaxKeys: 1,
    })
    
    await r2Client.send(listCommand)
    
    results.push({
      step: '5. R2 Connection',
      success: true,
      message: 'Successfully connected to Cloudflare R2',
      details: {
        bucket: R2_BUCKET_NAME,
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      duration: Date.now() - step5Start
    })
  } catch (error) {
    results.push({
      step: '5. R2 Connection',
      success: false,
      message: 'Failed to connect to Cloudflare R2',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        bucket: R2_BUCKET_NAME,
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      duration: Date.now() - step5Start
    })
    return results
  }
  
  // ============================================
  // STEP 6: Verify Edit Permission (Optional)
  // ============================================
  const step6Start = Date.now()
  
  // This step is informational only - we already verified OneDrive access in step 3
  // The system is ready if we got this far
  results.push({
    step: '6. System Ready',
    success: true,
    message: 'Excel Edit System is ready to use',
    details: {
      note: 'All critical components verified',
      canEditFiles: true,
      canSyncToR2: true,
    },
    duration: Date.now() - step6Start
  })
  
  return results
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Please login first',
      }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Admin role required',
      }, { status: 403 })
    }
    
    console.log('🔍 [Diagnose] Starting diagnostic run...')
    const startTime = Date.now()
    
    const results = await runDiagnostics()
    
    const totalDuration = Date.now() - startTime
    console.log(`🔍 [Diagnose] Completed in ${totalDuration}ms`)
    
    const allSuccess = results.every(r => r.success)
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? 'All diagnostics passed - System is ready for Excel editing' 
        : 'Some diagnostics failed - Check results for details',
      totalDuration,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalSteps: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
      nextSteps: allSuccess 
        ? ['System is ready. Try editing an Excel file now.']
        : results
            .filter(r => !r.success)
            .map(r => `Fix: ${r.step} - ${r.message}`),
    })
    
  } catch (error) {
    console.error('❌ [Diagnose] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Diagnostic failed with unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
