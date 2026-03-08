const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testDownload() {
    const key = 'sop/2026/03/00033c37-e1d7-4274-a21c-7123d1d3a30a.jpg';

    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        const response = await client.send(command);
        console.log('Success! Status:', response.$metadata.httpStatusCode);
        console.log('ContentType:', response.ContentType);
    } catch (err) {
        console.error('Download Error:', err.message);
        console.error('Code:', err.Code || err.name);
    }
}

testDownload();
