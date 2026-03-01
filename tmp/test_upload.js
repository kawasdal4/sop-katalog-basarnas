const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');

    // Login
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'foetainment@gmail.com');
    await page.fill('input[type="password"]', '048965');
    await page.click('button[type="submit"]');

    // Wait for login to complete (header profile button appears)
    console.log('Waiting for header profile dropdown...');
    await page.waitForSelector('button.text-white.hover\\:bg-white\\/10', { state: 'visible' });

    // Wait for animations
    await page.waitForTimeout(1000);

    // Click profile dropdown
    console.log('Clicking profile dropdown...');
    await page.click('button.text-white.hover\\:bg-white\\/10');

    // Click 'Pengaturan'
    console.log('Clicking Pengaturan...');
    await page.click('div[role="menuitem"]:has-text("Pengaturan")');

    // Wait for settings dialog
    console.log('Waiting for Settings dialog...');
    await page.waitForTimeout(1000);

    // Generate a dummy image to upload
    const imgPath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(imgPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

    // Upload file to the hidden input
    console.log('Uploading file...');
    const fileInput = await page.$('input#photo-upload');
    await fileInput.setInputFiles(imgPath);

    // Wait for cropper dialog to open
    console.log('Waiting for cropper dialog...');
    await page.waitForTimeout(1000);
    await page.waitForSelector('canvas');

    // Save screenshot
    console.log('Capturing screenshot...');
    const screenshotPath = path.join(__dirname, 'cropper_screenshot.png');
    await page.screenshot({ path: screenshotPath });

    console.log('Done! Screenshot saved to', screenshotPath);

    await browser.close();
})();
