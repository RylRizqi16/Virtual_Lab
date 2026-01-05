const db = require('../config/database');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { USE_SUPABASE } = require('../config/env');

// ==================== SUPABASE PROGRESS ====================

async function listProgressWithSupabase(req, res) {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('user_progress')
            .select('experiment, payload, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Parse payload if it's a string
        const records = (data || []).map(record => ({
            ...record,
            payload: typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload,
        }));

        return res.json({ records });
    } catch (error) {
        console.error('Kesalahan saat mengambil progres (Supabase):', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

async function saveProgressWithSupabase(req, res) {
    const userId = req.user.id;
    const { experiment, payload } = req.body || {};
    if (!experiment || !payload) {
        return res.status(400).json({ message: 'Eksperimen dan payload wajib diisi.' });
    }

    const payloadData = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        const { error } = await supabase
            .from('user_progress')
            .upsert({
                user_id: userId,
                experiment: experiment,
                payload: payloadData,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,experiment',
            });

        if (error) throw error;

        return res.status(201).json({ message: 'Progres tersimpan.' });
    } catch (error) {
        console.error('Kesalahan saat menyimpan progres (Supabase):', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// ==================== LEGACY DB PROGRESS ====================

async function listProgressWithDB(req, res) {
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

async function saveProgressWithDB(req, res) {
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
        try {
            let parsedPayload = null;
            try {
                parsedPayload = JSON.parse(payloadString);
            } catch (parseError) {
                if (payload && typeof payload === 'object') {
                    parsedPayload = payload;
                }
            }
            const metadata = {
                experiment,
                payload: parsedPayload,
                savedAt: new Date().toISOString(),
            };
            await db.query(
                'INSERT INTO user_activity_logs (user_id, activity_type, experiment, metadata) VALUES ($1, $2, $3, $4::jsonb)',
                [userId, 'simulation_progress', experiment, JSON.stringify(metadata)]
            );
        } catch (logError) {
            console.warn('Gagal mencatat log aktivitas progres:', logError.message);
        }
        return res.status(201).json({ message: 'Progres tersimpan.' });
    } catch (error) {
        console.error('Kesalahan saat menyimpan progres:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// ==================== EXPORTS (Auto-select based on config) ====================

const listProgress = USE_SUPABASE && isSupabaseConfigured ? listProgressWithSupabase : listProgressWithDB;
const saveProgress = USE_SUPABASE && isSupabaseConfigured ? saveProgressWithSupabase : saveProgressWithDB;

module.exports = {
    listProgress,
    saveProgress,
};
