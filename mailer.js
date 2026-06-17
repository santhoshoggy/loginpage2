require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// ── Email setup ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(toEmail, otp) {
  await transporter.sendMail({
    from: '"Login App" <' + process.env.EMAIL + '>',
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
  // Skip if Twilio not configured
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE;

  if (!sid || sid === 'your_account_sid_here' || !token || !from || from === '+1xxxxxxxxxx') {
    console.log('Twilio not configured — skipping SMS.');
    return;
  }

  const client = twilio(sid, token);

  let phone = toPhone.trim();
  if (/^\d{10}$/.test(phone)) {
    phone = '+91' + phone;
  }

  await client.messages.create({
    body: 'Your OTP is: ' + otp + '. Valid for 5 minutes. Do not share it.',
    from: from,
    to: phone
  });
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
