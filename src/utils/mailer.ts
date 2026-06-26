import nodemailer from 'nodemailer';

// Configure the email engine using standard Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your server's email address
        pass: process.env.EMAIL_PASS, // Your server's App Password
    },
});

export const sendOTP = async (to: string, otp: string) => {
    const mailOptions = {
        from: `"Financial Engine" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Your Authentication Code',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Verify Your Email</h2>
        <p>Your one-time password is:</p>
        <h1 style="color: #2563eb; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};
export const sendPasswordReset = async (to: string, resetCode: string) => {
    const mailOptions = {
        from: `"Financial Engine" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Password Reset Request',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Reset Your Password</h2>
        <p>Your 6-digit password reset code is:</p>
        <h1 style="color: #e11d48; letter-spacing: 5px;">${resetCode}</h1>
        <p>This code will expire in 15 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};