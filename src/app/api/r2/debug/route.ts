import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check R2 environment variables
 * Only shows presence/absence, not actual values
 */
export async function GET() {
  const envCheck = {
    R2_ACCOUNT_ID: {
      present: !!process.env.R2_ACCOUNT_ID,
      length: process.env.R2_ACCOUNT_ID?.length || 0,
      preview: process.env.R2_ACCOUNT_ID ? `${process.env.R2_ACCOUNT_ID.slice(0, 4)}...${process.env.R2_ACCOUNT_ID.slice(-4)}` : null
    },
    R2_ACCESS_KEY_ID: {
      present: !!process.env.R2_ACCESS_KEY_ID,
      length: process.env.R2_ACCESS_KEY_ID?.length || 0,
    },
    R2_SECRET_ACCESS_KEY: {
      present: !!process.env.R2_SECRET_ACCESS_KEY,
      length: process.env.R2_SECRET_ACCESS_KEY?.length || 0,
    },
    R2_BUCKET_NAME: {
      present: !!process.env.R2_BUCKET_NAME,
      value: process.env.R2_BUCKET_NAME || null,
    },
    R2_PUBLIC_URL: {
      present: !!process.env.R2_PUBLIC_URL,
      value: process.env.R2_PUBLIC_URL || null,
    },
    // Check for alternative naming
    R2_ACCESS_KEY: {
      present: !!process.env.R2_ACCESS_KEY,
      length: process.env.R2_ACCESS_KEY?.length || 0,
    },
    R2_SECRET_KEY: {
      present: !!process.env.R2_SECRET_KEY,
      length: process.env.R2_SECRET_KEY?.length || 0,
    },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  const allRequired = envCheck.R2_ACCOUNT_ID.present && 
                      envCheck.R2_ACCESS_KEY_ID.present && 
                      envCheck.R2_SECRET_ACCESS_KEY.present

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
    },
    r2Config: envCheck,
    summary: {
      allRequiredPresent: allRequired,
      missingVariables: [
        !envCheck.R2_ACCOUNT_ID.present && 'R2_ACCOUNT_ID',
        !envCheck.R2_ACCESS_KEY_ID.present && 'R2_ACCESS_KEY_ID',
        !envCheck.R2_SECRET_ACCESS_KEY.present && 'R2_SECRET_ACCESS_KEY',
      ].filter(Boolean),
    },
    instructions: !allRequired ? [
      'Set the following environment variables in Vercel:',
      '1. R2_ACCOUNT_ID - Your Cloudflare account ID',
      '2. R2_ACCESS_KEY_ID - R2 API token Access Key ID',
      '3. R2_SECRET_ACCESS_KEY - R2 API token Secret Access Key',
      '4. R2_BUCKET_NAME - (optional) Bucket name, defaults to "sop-katalog-basarnas"',
      '',
      'Go to: Vercel Dashboard > Your Project > Settings > Environment Variables',
    ] : null
  })
}
