const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'virtual-lab-secret-change-me';

const parsedSaltRounds = parseInt(process.env.SALT_ROUNDS, 10);
const SALT_ROUNDS = Number.isFinite(parsedSaltRounds) && parsedSaltRounds > 0 ? parsedSaltRounds : 10;
if (SALT_ROUNDS !== parsedSaltRounds && process.env.SALT_ROUNDS) {
    console.warn('SALT_ROUNDS tidak valid. Menggunakan nilai default 10.');
}
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const DATABASE_URL = process.env.DATABASE_URL || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const USE_SUPABASE = SUPABASE_URL !== '' && (SUPABASE_SERVICE_KEY !== '' || SUPABASE_ANON_KEY !== '');

module.exports = {
    PORT,
    JWT_SECRET,
    SALT_ROUNDS,
    CLIENT_ORIGIN,
    DATABASE_URL,
    NODE_ENV,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    SUPABASE_ANON_KEY,
    USE_SUPABASE,
};
