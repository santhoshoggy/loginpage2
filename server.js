require('dotenv').config();
const express = require('express');
const path = require('path');
const { getDB, saveDB } = require('./database');
const { sendOTP } = require('./mailer');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Run a SELECT and return array of row objects
function queryAll(db, sql, params) {
  params = params || [];
  var i = 0;
  var safeSql = sql.replace(/\?/g, function() {
    var val = params[i++];
    return typeof val === 'string' ? "'" + val.replace(/'/g, "''") + "'" : val;
  });
  var result = db.exec(safeSql);
  if (!result.length) return [];
  var cols = result[0].columns;
  return result[0].values.map(function(row) {
    var obj = {};
    cols.forEach(function(col, j) { obj[col] = row[j]; });
    return obj;
  });
}

function esc(str) {
  return str.replace(/'/g, "''");
}

// ── REGISTER: save pending user + send OTP ──────────────────────────────────
app.post('/api/register', async function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var email    = req.body.email;
  var phone    = req.body.phone;

  if (!username || !password || !email || !phone) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  var db = await getDB();

  // Check if username already exists
  var existing = queryAll(db, "SELECT id FROM users WHERE username = ?", [username]);
  if (existing.length) {
    return res.json({ success: false, message: 'Username already taken.' });
  }

  // Save as pending registration
  db.run("DELETE FROM pending_users WHERE username = '" + esc(username) + "'");
  db.run("INSERT INTO pending_users (username, password, email, phone) VALUES ('" +
    esc(username) + "','" + esc(password) + "','" + esc(email) + "','" + esc(phone) + "')");

  var otp = generateOTP();
  var expiresAt = Date.now() + 5 * 60 * 1000;
  db.run("DELETE FROM otp_store WHERE username = '" + esc(username) + "'");
  db.run("INSERT INTO otp_store (username, otp, expires_at) VALUES ('" +
    esc(username) + "','" + otp + "'," + expiresAt + ")");
  saveDB(db);

  console.log('[REGISTER] Sending OTP to email: ' + email + ' | phone: ' + phone);

  // Send OTP to email and phone
  try {
    await sendOTP(email, phone, otp);
  } catch (err) {
    console.error('OTP send failed:', err.message);
  }

  res.json({
    success: true,
    message: 'OTP sent to ' + email + ' and ' + phone
  });
});

// ── VERIFY REGISTER OTP: confirm and move to users table ────────────────────
app.post('/api/verify-register-otp', async function(req, res) {
  var username = req.body.username;
  var otp      = req.body.otp;
  var db = await getDB();

  var records = queryAll(db, "SELECT * FROM otp_store WHERE username = ?", [username]);
  if (!records.length) {
    return res.json({ success: false, message: 'No OTP found. Please register again.' });
  }

  var record = records[0];
  if (Date.now() > record.expires_at) {
    db.run("DELETE FROM otp_store WHERE username = '" + esc(username) + "'");
    db.run("DELETE FROM pending_users WHERE username = '" + esc(username) + "'");
    saveDB(db);
    return res.json({ success: false, message: 'OTP expired. Please register again.' });
  }

  if (record.otp !== otp) {
    return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
  }

  // Move from pending to users
  var pending = queryAll(db, "SELECT * FROM pending_users WHERE username = ?", [username]);
  if (!pending.length) {
    return res.json({ success: false, message: 'Registration data not found. Please register again.' });
  }

  var p = pending[0];
  db.run("INSERT INTO users (username, password, email, phone) VALUES ('" +
    esc(p.username) + "','" + esc(p.password) + "','" + esc(p.email) + "','" + esc(p.phone) + "')");
  db.run("DELETE FROM pending_users WHERE username = '" + esc(username) + "'");
  db.run("DELETE FROM otp_store WHERE username = '" + esc(username) + "'");
  saveDB(db);

  res.json({ success: true, message: 'Registration successful!' });
});

// ── LOGIN: check credentials only ────────────────────────────────────────────
app.post('/api/login', async function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var db = await getDB();

  var users = queryAll(db, "SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
  if (!users.length) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  res.json({ success: true, message: 'Login successful!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, function() {
  console.log('Server running at http://localhost:' + PORT);
});
