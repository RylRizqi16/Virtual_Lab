const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, SALT_ROUNDS } = require('../config/env');

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function register(req, res) {
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

async function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }

    try {
        const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }

        const token = generateToken(user);
        return res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Kesalahan saat login pengguna:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function getMe(req, res) {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [userId]);
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

function authMiddleware(req, res, next) {
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

module.exports = {
    register,
    login,
    getMe,
    authMiddleware,
};
