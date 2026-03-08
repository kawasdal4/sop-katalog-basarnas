const { uploadToR2 } = require('./src/lib/r2-storage');
const fs = require('fs');
require('dotenv').config();

async function testUpload() {
    const buffer = Buffer.from('test image content');
    const userId = 'test-user-id';
    const fileExt = 'jpg';
    const photoKey = `profile-photos/${userId}-${Date.now()}.${fileExt}`;

    console.log('Attempting upload to:', photoKey);

    try {
        const result = await uploadToR2(buffer, 'test.jpg', 'image/jpeg', { key: photoKey });
        console.log('Upload Result:', JSON.stringify(result, null, 2));

        if (result.key === photoKey) {
            console.log('✅ SUCCESS: Key matches!');
        } else {
            console.log('❌ FAILURE: Key mismatch! Got:', result.key);
        }
    } catch (err) {
        console.error('Upload Error:', err);
    }
}

testUpload();
