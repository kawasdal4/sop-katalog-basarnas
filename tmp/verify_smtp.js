require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function verifySMTPSettings() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    });

    console.log("Verifying connection to SMTP server...");

    try {
        const success = await transporter.verify();
        console.log("Server is ready to take our messages. Success:", success);
    } catch (error) {
        console.error("Verification failed:", JSON.stringify(error, null, 2));
        if (error.response) {
            console.error("Response details:", error.response);
        }
    }
}

verifySMTPSettings();
