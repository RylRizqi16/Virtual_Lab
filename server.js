const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'virtual-lab-secret-change-me';
const SALT_ROUNDS = 10;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'virtual_lab.db');
const db = new sqlite3.Database(dbPath);

// Ensure tables exist
const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    experiment TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, experiment),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

db.exec(initSql, (err) => {
    if (err) {
        console.error('Gagal menginisialisasi database:', err.message);
    } else {
        console.log('Database siap digunakan di', dbPath);
    }
});

app.use(cors());
app.use(express.json());

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
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
    } catch (err) {
        return res.status(401).json({ message: 'Token tidak valid.' });
    }
}

app.post('/api/register', async (req, res) => {
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
});

app.post('/api/login', (req, res) => {
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
            return res.json({
                token,
                user: { id: user.id, email: user.email },
            });
        } catch (compareErr) {
            console.error('Kesalahan saat memverifikasi kata sandi:', compareErr);
            return res.status(500).json({ message: 'Tidak dapat memproses permintaan.' });
        }
    });
});

app.get('/api/me', authMiddleware, (req, res) => {
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
});

app.get('/api/progress', authMiddleware, (req, res) => {
    const userId = req.user.id;
    db.all(
        'SELECT experiment, payload, created_at, updated_at FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Kesalahan saat mengambil progres:', err);
                return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
            }
            return res.json({ records: rows });
        }
    );
});

app.post('/api/progress', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { experiment, payload } = req.body || {};
    if (!experiment || !payload) {
        return res.status(400).json({ message: 'Eksperimen dan payload wajib diisi.' });
    }
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const sql = `
        INSERT INTO user_progress (user_id, experiment, payload, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id, experiment)
        DO UPDATE SET payload = excluded.payload, updated_at = datetime('now');
    `;
    db.run(sql, [userId, experiment, payloadString], function (err) {
        if (err) {
            console.error('Kesalahan saat menyimpan progres:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
        }
        return res.status(201).json({ message: 'Progres tersimpan.' });
    });
});

const staticDir = __dirname;
app.use(express.static(staticDir));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(staticDir, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan yang tidak terduga.' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
