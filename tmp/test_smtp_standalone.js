require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('Testing SMTP connection...');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        debug: true, // show debug output
        logger: true // log information in console
    });

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
            to: 'foetainment@gmail.com',
            subject: 'Test Email from Node.js (Brevo SMTP)',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<b>This is a test email</b> to verify SMTP configuration.',
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.error('Error occurred while sending email:', error);
    }
}

testSMTP();
