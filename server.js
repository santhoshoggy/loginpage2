require('dotenv').config();
const express = require('express');
const path = require('path');
const { getDB, initDB } = require('./database');
const { sendOTP } = require('./mailer');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── REGISTER ─────────────────────────────────────────────────────────────────
app.post('/api/register', async function(req, res) {
  var { username, password, email, phone } = req.body;
  if (!username || !password || !email || !phone) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  const db = await getDB();

  const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length) {
    return res.json({ success: false, message: 'Username already taken.' });
  }

  await db.query('DELETE FROM pending_users WHERE username = $1', [username]);
  await db.query(
    'INSERT INTO pending_users (username, password, email, phone) VALUES ($1,$2,$3,$4)',
    [username, password, email, phone]
  );

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await db.query('DELETE FROM otp_store WHERE username = $1', [username]);
  await db.query(
    'INSERT INTO otp_store (username, otp, expires_at) VALUES ($1,$2,$3)',
    [username, otp, expiresAt]
  );

  console.log('[REGISTER] Sending OTP to email: ' + email);
  try {
    await sendOTP(email, phone, otp);
  } catch (err) {
    console.error('OTP send failed:', err.message);
  }

  res.json({ success: true, message: 'OTP sent to ' + email });
});

// ── VERIFY REGISTER OTP ───────────────────────────────────────────────────────
app.post('/api/verify-register-otp', async function(req, res) {
  var { username, otp } = req.body;
  const db = await getDB();

  const records = await db.query('SELECT * FROM otp_store WHERE username = $1', [username]);
  if (!records.rows.length) {
    return res.json({ success: false, message: 'No OTP found. Please register again.' });
  }

  const record = records.rows[0];
  if (Date.now() > parseInt(record.expires_at)) {
    await db.query('DELETE FROM otp_store WHERE username = $1', [username]);
    await db.query('DELETE FROM pending_users WHERE username = $1', [username]);
    return res.json({ success: false, message: 'OTP expired. Please register again.' });
  }

  if (record.otp !== otp) {
    return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
  }

  const pending = await db.query('SELECT * FROM pending_users WHERE username = $1', [username]);
  if (!pending.rows.length) {
    return res.json({ success: false, message: 'Registration data not found. Please register again.' });
  }

  const p = pending.rows[0];
  await db.query(
    'INSERT INTO users (username, password, email, phone) VALUES ($1,$2,$3,$4)',
    [p.username, p.password, p.email, p.phone]
  );
  await db.query('DELETE FROM pending_users WHERE username = $1', [username]);
  await db.query('DELETE FROM otp_store WHERE username = $1', [username]);

  res.json({ success: true, message: 'Registration successful!' });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/api/login', async function(req, res) {
  var { username, password } = req.body;
  const db = await getDB();

  const users = await db.query(
    'SELECT * FROM users WHERE username = $1 AND password = $2',
    [username, password]
  );
  if (!users.rows.length) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  res.json({ success: true, message: 'Login successful!' });
});

const PORT = process.env.PORT || 3001;

initDB().then(function() {
  app.listen(PORT, function() {
    console.log('Server running at http://localhost:' + PORT);
  });
}).catch(function(err) {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
