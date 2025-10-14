const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, SALT_ROUNDS } = require('../config/env');

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function register(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Kata sandi minimal 6 karakter.' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
        if (err) {
            console.error('Kesalahan saat mengecek pengguna:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
        }
        if (row) {
            return res.status(409).json({ message: 'Email sudah terdaftar.' });
        }
        try {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash], function (insertErr) {
                if (insertErr) {
                    console.error('Kesalahan saat menyimpan pengguna:', insertErr);
                    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
                }
                return res.status(201).json({ message: 'Registrasi berhasil.' });
            });
        } catch (hashErr) {
            console.error('Kesalahan hash kata sandi:', hashErr);
            return res.status(500).json({ message: 'Tidak dapat memproses permintaan.' });
        }
    });
}

function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    }

    db.get('SELECT id, email, password_hash FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Kesalahan saat mencari pengguna:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Email atau kata sandi salah.' });
        }
        try {
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                return res.status(401).json({ message: 'Email atau kata sandi salah.' });
            }
            const token = generateToken(user);
            return res.json({ token, user: { id: user.id, email: user.email } });
        } catch (compareErr) {
            console.error('Kesalahan saat memverifikasi kata sandi:', compareErr);
            return res.status(500).json({ message: 'Tidak dapat memproses permintaan.' });
        }
    });
}

function getMe(req, res) {
    const userId = req.user.id;
    db.get('SELECT id, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Kesalahan saat mengambil pengguna:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
        }
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        return res.json({ user });
    });
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
