require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// ── Email setup ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  }
});

async function sendOTPEmail(toEmail, otp) {
  await transporter.sendMail({
    from: '"Login App" <af11ab001@smtp-brevo.com>',
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

// ── SMS setup ────────────────────────────────────────────────────────────────
async function sendOTPSMS(toPhone, otp) {
  // Twilio free trial doesn't support Indian numbers — skipping SMS
  console.log('SMS skipped — using email OTP only.');
  return;
}

// ── Send both ────────────────────────────────────────────────────────────────
async function sendOTP(toEmail, toPhone, otp) {
  const results = await Promise.allSettled([
    sendOTPEmail(toEmail, otp),
    sendOTPSMS(toPhone, otp)
  ]);

  results.forEach(function(r, i) {
    const channel = i === 0 ? 'Email' : 'SMS';
    if (r.status === 'fulfilled') {
      console.log(channel + ' OTP sent successfully.');
    } else {
      console.error(channel + ' OTP failed:', r.reason.message);
    }
  });
}

module.exports = { sendOTP };
