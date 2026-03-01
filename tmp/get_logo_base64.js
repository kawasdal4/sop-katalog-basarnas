
const fs = require('fs');
const path = require('path');
const logoPath = path.join(process.cwd(), 'public', 'logo-sar.png');
if (fs.existsSync(logoPath)) {
    const base64 = fs.readFileSync(logoPath).toString('base64');
    console.log(`data:image/png;base64,${base64}`);
} else {
    console.log('');
}
