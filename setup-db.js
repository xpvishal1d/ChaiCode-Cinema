// setup-db.js - Creates tables if they don't exist
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);
    console.log('✅ Users table ready');

    // Create seats table (matches your schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        isbooked INT DEFAULT 0,
        booked_by INT REFERENCES users(id)
      );
    `);
    console.log('✅ Seats table ready');

    // Insert 20 seats if none exist
    const result = await pool.query('SELECT COUNT(*) FROM seats');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO seats (isbooked)
        SELECT 0 FROM generate_series(1, 20);
      `);
      console.log('✅ 20 seats created');
    }

    console.log('✅ Database setup complete');
  } catch (err) {
    console.error('❌ Database setup error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();