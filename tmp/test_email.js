const nodemailer = require('nodemailer');

async function testEmail() {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'e.katalog.sop@gmail.com',
            pass: 'gwmidujvluhdtxtw'
        }
    });

    const mailOptions = {
        from: '"E-Katalog SOP Direktorat Kesiapsiagaan" <e.katalog.sop@gmail.com>',
        to: 'e.katalog.sop@gmail.com', // Sending to itself for testing
        subject: 'Test Email dari Sistem SOP',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Test Konfigurasi Email Berhasil!</h2>
        <p>Jika Anda menerima email ini, berarti konfigurasi Nodemailer dan Gmail SMTP App Password Anda sudah benar.</p>
        <p>Waktu test: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      </div>
    `
    };

    try {
        console.log('Mengirim email test...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email berhasil dikirim!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Gagal mengirim email:', error);
    }
}

testEmail();
