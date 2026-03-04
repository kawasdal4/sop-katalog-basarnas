/**
 * Validates that all required environment variables are present.
 * This should be called early in the application lifecycle.
 */
export function validateEnv() {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'DATABASE_URL',
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME',
    ]

    const missing = required.filter((key) => {
        // Access key check (allow R2_ACCESS_KEY_ID or R2_ACCESS_KEY)
        if (key === 'R2_ACCESS_KEY_ID') {
            return !process.env.R2_ACCESS_KEY_ID && !process.env.R2_ACCESS_KEY
        }
        // Secret key check (allow R2_SECRET_ACCESS_KEY or R2_SECRET_KEY)
        if (key === 'R2_SECRET_ACCESS_KEY') {
            return !process.env.R2_SECRET_ACCESS_KEY && !process.env.R2_SECRET_KEY
        }
        return !process.env[key]
    })

    if (missing.length > 0) {
        const errorMsg = `❌ Missing required environment variables: ${missing.join(', ')}`
        console.error(errorMsg)

        // In production build, we want to fail hard
        if (process.env.NODE_ENV === 'production') {
            throw new Error(errorMsg)
        }

        return false
    }

    console.log('✅ Environment variables validated.')
    return true
}
