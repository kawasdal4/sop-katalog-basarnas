require('dotenv').config();

function extractAccountIdFromEndpoint(endpoint) {
    try {
        const url = new URL(endpoint);
        const hostname = url.hostname;
        const match = hostname.match(/^([a-f0-9]+)\.r2\.cloudflarestorage\.com$/i);
        if (match) return match[1];
    } catch { }
    return null;
}

function getR2Config() {
    let accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId && process.env.R2_ENDPOINT) {
        accountId = extractAccountIdFromEndpoint(process.env.R2_ENDPOINT) || undefined;
    }
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'sop-katalog-basarnas';
    const publicUrl = process.env.R2_PUBLIC_URL;

    return { accountId, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, bucketName, publicUrl };
}

console.log('R2 Config (Safe):', JSON.stringify(getR2Config(), null, 2));
