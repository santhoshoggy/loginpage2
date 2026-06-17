const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getDB() {
  return pool;
}

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_store (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `);
    console.log('Database initialized.');
  } finally {
    client.release();
  }
}

module.exports = { getDB, initDB };
