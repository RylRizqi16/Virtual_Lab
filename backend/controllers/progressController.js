const db = require('../config/database');

function listProgress(req, res) {
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
}

function saveProgress(req, res) {
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
    db.run(sql, [userId, experiment, payloadString], (err) => {
        if (err) {
            console.error('Kesalahan saat menyimpan progres:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
        }
        return res.status(201).json({ message: 'Progres tersimpan.' });
    });
}

module.exports = {
    listProgress,
    saveProgress,
};
