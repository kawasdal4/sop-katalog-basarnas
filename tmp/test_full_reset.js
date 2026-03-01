async function testResetPasswordFlow() {
    console.log("1. Requesting forgot password...");
    const forgotRes = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'foetainment@gmail.com' })
    });
    const forgotData = await forgotRes.json();
    console.log("Forgot Password Response:", forgotData);

    // Use Prisma to extract the token directly from DB because we don't want to wait for email
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
        where: { email: 'foetainment@gmail.com' }
    });

    if (!user || !user.resetToken) {
        console.error("No reset token found in DB!");
        return;
    }

    console.log("2. Found reset token:", user.resetToken);

    console.log("3. Resetting password...");
    const resetRes = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'foetainment@gmail.com',
            token: user.resetToken,
            newPassword: 'newpassword123'
        })
    });
    const resetData = await resetRes.json();
    console.log("Reset Password Response:", resetData);

    // Restore old password just in case
    await prisma.user.update({
        where: { email: 'foetainment@gmail.com' },
        data: { password: '048965' } // the user's actual background password
    });
    console.log("Restored DB state.");
}

testResetPasswordFlow();
