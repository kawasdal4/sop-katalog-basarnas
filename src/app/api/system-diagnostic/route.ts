/**
 * System Diagnostic API - Comprehensive system health check and error tracking
 * 
 * GET: Run diagnostic checks on all system components
 * POST: Log an error to the error tracking system
 * DELETE: Mark an error as resolved
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

interface DiagnosticStepResult {
  step: string
  success: boolean
  message: string
  error?: string
  details?: Record<string, unknown>
  duration: number
}

// Helper to check if user is developer
const isDeveloper = async (): Promise<string | null> => {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) return null
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true }
  })
  
  if (!user || user.role !== 'DEVELOPER') return null
  
  return user.id
}

// Run system diagnostics
async function runDiagnostics() {
  const results: DiagnosticStepResult[] = []
  const startTime = Date.now()
  
  // ============================================
  // STEP 1: Database Connection
  // ============================================
  const step1Start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    results.push({
      step: '1. Database Connection',
      success: true,
      message: 'Database connection successful',
      duration: Date.now() - step1Start
    })
  } catch (error) {
    results.push({
      step: '1. Database Connection',
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step1Start
    })
    return results // Stop if DB is down
  }
  
  // ============================================
  // STEP 2: Environment Variables Check
  // ============================================
  const step2Start = Date.now()
  const envCheck = {
    AZURE_TENANT_ID: !!process.env.AZURE_TENANT_ID || !!process.env.TENANT_ID,
    AZURE_CLIENT_ID: !!process.env.AZURE_CLIENT_ID || !!process.env.CLIENT_ID,
    AZURE_CLIENT_SECRET: !!process.env.AZURE_CLIENT_SECRET || !!process.env.CLIENT_SECRET,
    M365_SERVICE_ACCOUNT: !!process.env.M365_SERVICE_ACCOUNT,
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY: !!process.env.R2_ACCESS_KEY || !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_KEY: !!process.env.R2_SECRET_KEY || !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: !!process.env.R2_BUCKET || !!process.env.R2_BUCKET_NAME,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  }
  
  const missingEnv = Object.entries(envCheck).filter(([_, v]) => !v).map(([k]) => k)
  
  results.push({
    step: '2. Environment Variables',
    success: missingEnv.length === 0,
    message: missingEnv.length === 0 ? 'All environment variables set' : `Missing: ${missingEnv.join(', ')}`,
    details: envCheck,
    duration: Date.now() - step2Start
  })
  
  // ============================================
  // STEP 3: R2 Storage Connection
  // ============================================
  const step3Start = Date.now()
  try {
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
    const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID
    const R2_SECRET_KEY = process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY
    const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME
    
    if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET) {
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY,
          secretAccessKey: R2_SECRET_KEY,
        },
      })
      
      await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 1 }))
      
      results.push({
        step: '3. R2 Storage',
        success: true,
        message: `Connected to R2 bucket: ${R2_BUCKET}`,
        duration: Date.now() - step3Start
      })
    } else {
      results.push({
        step: '3. R2 Storage',
        success: false,
        message: 'R2 credentials not configured',
        duration: Date.now() - step3Start
      })
    }
  } catch (error) {
    results.push({
      step: '3. R2 Storage',
      success: false,
      message: 'R2 connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step3Start
    })
  }
  
  // ============================================
  // STEP 4: Azure AD Token Test
  // ============================================
  const step4Start = Date.now()
  try {
    const tenantId = process.env.AZURE_TENANT_ID || process.env.TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET || process.env.CLIENT_SECRET
    
    if (tenantId && clientId && clientSecret) {
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }).toString(),
      })
      
      if (tokenResponse.ok) {
        results.push({
          step: '4. Azure AD Token',
          success: true,
          message: 'Successfully obtained Azure AD token',
          duration: Date.now() - step4Start
        })
      } else {
        const error = await tokenResponse.text()
        results.push({
          step: '4. Azure AD Token',
          success: false,
          message: 'Failed to obtain Azure AD token',
          error: `${tokenResponse.status}: ${error}`,
          duration: Date.now() - step4Start
        })
      }
    } else {
      results.push({
        step: '4. Azure AD Token',
        success: false,
        message: 'Azure AD credentials not configured',
        duration: Date.now() - step4Start
      })
    }
  } catch (error) {
    results.push({
      step: '4. Azure AD Token',
      success: false,
      message: 'Azure AD token test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step4Start
    })
  }
  
  // ============================================
  // STEP 5: Recent Error Count
  // ============================================
  const step5Start = Date.now()
  try {
    const unresolvedErrors = await db.errorLog.count({
      where: { resolved: false }
    })
    
    const recentErrors = await db.errorLog.findMany({
      where: { 
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        errorType: true,
        message: true,
        severity: true,
        createdAt: true
      }
    })
    
    results.push({
      step: '5. Error Status',
      success: true,
      message: `${unresolvedErrors} unresolved errors`,
      details: {
        unresolvedCount: unresolvedErrors,
        recentErrors
      },
      duration: Date.now() - step5Start
    })
  } catch (error) {
    results.push({
      step: '5. Error Status',
      success: false,
      message: 'Could not fetch error status',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step5Start
    })
  }
  
  // ============================================
  // STEP 6: File Statistics
  // ============================================
  const step6Start = Date.now()
  try {
    const totalFiles = await db.sopFile.count()
    const activeFiles = await db.sopFile.count({ where: { status: 'AKTIF' } })
    const totalUsers = await db.user.count()
    
    results.push({
      step: '6. File Statistics',
      success: true,
      message: `${totalFiles} files, ${totalUsers} users`,
      details: { totalFiles, activeFiles, totalUsers },
      duration: Date.now() - step6Start
    })
  } catch (error) {
    results.push({
      step: '6. File Statistics',
      success: false,
      message: 'Could not fetch statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - step6Start
    })
  }
  
  return {
    totalDuration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalSteps: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  }
}

// GET - Run diagnostics
export async function GET() {
  try {
    const userId = await isDeveloper()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Developer access required' }, { status: 403 })
    }
    
    const diagnostic = await runDiagnostics()
    return NextResponse.json({ success: true, ...diagnostic })
    
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Log an error
export async function POST(request: NextRequest) {
  try {
    const userId = await isDeveloper()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Developer access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { errorType, message, stack, context, severity = 'error' } = body
    
    if (!errorType || !message) {
      return NextResponse.json({ error: 'errorType and message are required' }, { status: 400 })
    }
    
    const errorLog = await db.errorLog.create({
      data: {
        errorType,
        message,
        stack: stack || null,
        context: context ? JSON.stringify(context) : null,
        severity
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      errorLog: {
        id: errorLog.id,
        errorType: errorLog.errorType,
        message: errorLog.message,
        severity: errorLog.severity,
        createdAt: errorLog.createdAt
      }
    })
    
  } catch (error) {
    console.error('Error logging failed:', error)
    return NextResponse.json({
      error: 'Failed to log error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Mark error as resolved
export async function DELETE(request: NextRequest) {
  try {
    const userId = await isDeveloper()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Developer access required' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const errorId = searchParams.get('id')
    
    if (!errorId) {
      return NextResponse.json({ error: 'Error ID required' }, { status: 400 })
    }
    
    const updated = await db.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Error marked as resolved',
      errorLog: updated
    })
    
  } catch (error) {
    console.error('Error resolution failed:', error)
    return NextResponse.json({
      error: 'Failed to resolve error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
