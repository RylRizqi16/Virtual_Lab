const db = require('../config/database');

async function listProgress(req, res) {
    const userId = req.user.id;
    try {
        const result = await db.query(
            'SELECT experiment, payload, created_at, updated_at FROM user_progress WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        return res.json({ records: result.rows });
    } catch (error) {
        console.error('Kesalahan saat mengambil progres:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function saveProgress(req, res) {
    const userId = req.user.id;
    const { experiment, payload } = req.body || {};
    if (!experiment || !payload) {
        return res.status(400).json({ message: 'Eksperimen dan payload wajib diisi.' });
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const sql = `
        INSERT INTO user_progress (user_id, experiment, payload, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, experiment)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
    `;

    try {
        await db.query(sql, [userId, experiment, payloadString]);
        return res.status(201).json({ message: 'Progres tersimpan.' });
    } catch (error) {
        console.error('Kesalahan saat menyimpan progres:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

module.exports = {
    listProgress,
    saveProgress,
};
