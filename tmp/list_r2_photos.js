const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function listPhotos() {
    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: 'sop/2026/',
        });

        const response = await client.send(command);
        if (!response.Contents) {
            console.log('No objects found');
        } else {
            response.Contents.forEach(o => console.log(o.Key));
        }
    } catch (err) {
        console.error('R2 Error:', err);
    }
}

listPhotos();
