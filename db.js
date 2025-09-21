import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Assurez-vous que la variable est définie
  ssl: {
    rejectUnauthorized: false, // nécessaire si Render utilise SSL
  },
});

export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Postgres connected. Current time:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Postgres connection error:', err);
  } finally {
    await pool.end();
  }
}

