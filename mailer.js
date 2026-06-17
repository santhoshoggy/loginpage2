const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOTPEmail(toEmail, otp) {
  await resend.emails.send({
    from: 'Login App <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Your OTP Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:24px;
                  border:1px solid #eee;border-radius:10px;">
        <h2 style="color:#4a6cf7;">OTP Verification</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing:8px;color:#333;">${otp}</h1>
        <p style="color:#888;font-size:13px;">
          Valid for 5 minutes. Do not share it with anyone.
        </p>
      </div>
    `
  });
}

async function sendOTP(toEmail, toPhone, otp) {
  try {
    await sendOTPEmail(toEmail, otp);
    console.log('Email OTP sent successfully.');
  } catch (err) {
    console.error('Email OTP failed:', err.message);
  }
}

module.exports = { sendOTP };
