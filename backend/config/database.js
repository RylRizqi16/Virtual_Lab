const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL belum dikonfigurasi. Setel kredensial koneksi Postgres (mis. dari Neon) sebelum menjalankan backend.');
}

const shouldUseSSL = !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
    console.error('Kesalahan koneksi database:', err.message);
});

const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experiment TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, experiment)
);

CREATE TABLE IF NOT EXISTS user_quiz_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experiment TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    UNIQUE(user_id, experiment)
);
`;

(async () => {
    try {
        await pool.query(initSql);
        console.log('Koneksi PostgreSQL berhasil. Tabel siap digunakan.');
    } catch (error) {
        console.error('Gagal menginisialisasi skema database:', error.message);
        throw error;
    }
})();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
