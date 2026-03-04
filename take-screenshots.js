const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

(async () => {
    console.log('Menjalankan browser headles...');
    const browser = await puppeteer.launch({
        headless: 'new', // or true
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log('Membaca Halaman Publik...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000)); // Wait for animations
        await page.screenshot({ path: path.join(dir, '1_akses_publik.jpg'), type: 'jpeg', quality: 80, fullPage: false });
        console.log('✅ Screenshot Publik berhasil: 1_akses_publik.jpg');

        // Attempt to open Login
        console.log('Mencoba membuka Login...');
        const loginButton = await page.$('button:has-text("Masuk Aplikasi"), button:has-text("Login"), a:has-text("Login")');
        if (loginButton) {
            await loginButton.click();
            await new Promise(r => setTimeout(r, 1500));
            await page.screenshot({ path: path.join(dir, '2_login_modal.jpg'), type: 'jpeg', quality: 80 });
            console.log('✅ Screenshot Login berhasil: 2_login_modal.jpg');
        }

        // Capture Dashboard (If possible without login, maybe just navigate, else we'll just mock it or skip it)
        console.log('Dashboard login protected, skipping real dashboard. Will generate generic dashboard representation later if needed.');

    } catch (error) {
        console.error('Error saat mengambil screenshot:', error);
    } finally {
        await browser.close();
    }
})();
