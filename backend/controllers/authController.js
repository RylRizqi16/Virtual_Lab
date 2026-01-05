const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { JWT_SECRET, SALT_ROUNDS, USE_SUPABASE } = require('../config/env');

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

// ==================== SUPABASE AUTH ====================

async function registerWithSupabase(req, res) {
    const { email, password, fullName } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Kata sandi minimal 6 karakter.' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName || '' },
            },
        });

        if (error) {
            if (error.message.includes('already registered')) {
                return res.status(409).json({ message: 'Email sudah terdaftar.' });
            }
            throw error;
        }

        return res.status(201).json({ message: 'Registrasi berhasil.' });
    } catch (error) {
        console.error('Kesalahan saat registrasi (Supabase):', error);
        return res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
}

async function loginWithSupabase(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }

        return res.json({
            token: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || '',
            },
        });
    } catch (error) {
        console.error('Kesalahan saat login (Supabase):', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function getMeWithSupabase(req, res) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser(req.supabaseToken);
        
        if (error || !user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
            },
        });
    } catch (error) {
        console.error('Kesalahan saat mengambil data pengguna (Supabase):', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function supabaseAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
        return res.status(401).json({ message: 'Token tidak ditemukan.' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ message: 'Token tidak valid.' });
        }

        req.user = { id: user.id, email: user.email };
        req.supabaseToken = token;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid.' });
    }
}

// ==================== LEGACY DB AUTH ====================

async function registerWithDB(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Kata sandi minimal 6 karakter.' });
    }

    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ message: 'Email sudah terdaftar.' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);
        return res.status(201).json({ message: 'Registrasi berhasil.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Email sudah terdaftar.' });
        }
        console.error('Kesalahan saat registrasi pengguna:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function loginWithDB(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }

    try {
        const result = await db.query('SELECT id, email, password_hash, full_name, institution, bio FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }

        const token = generateToken(user);
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                institution: user.institution,
                bio: user.bio,
            },
        });
    } catch (error) {
        console.error('Kesalahan saat login pengguna:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function getMeWithDB(req, res) {
    const userId = req.user.id;
    try {
        const result = await db.query(
            'SELECT id, email, full_name, institution, bio, created_at FROM users WHERE id = $1',
            [userId]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        return res.json({ user });
    } catch (error) {
        console.error('Kesalahan saat mengambil data pengguna:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

function dbAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ message: 'Token tidak ditemukan.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid.' });
    }
}

// ==================== EXPORTS (Auto-select based on config) ====================

const register = USE_SUPABASE && isSupabaseConfigured ? registerWithSupabase : registerWithDB;
const login = USE_SUPABASE && isSupabaseConfigured ? loginWithSupabase : loginWithDB;
const getMe = USE_SUPABASE && isSupabaseConfigured ? getMeWithSupabase : getMeWithDB;
const authMiddleware = USE_SUPABASE && isSupabaseConfigured ? supabaseAuthMiddleware : dbAuthMiddleware;

module.exports = {
    register,
    login,
    getMe,
    authMiddleware,
};
