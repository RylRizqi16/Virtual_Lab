const db = require('../config/database');

function parseJsonField(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function sanitizeField(input, maxLength) {
    if (input === undefined) {
        return { provided: false };
    }
    if (typeof input !== 'string') {
        return { error: 'Format data tidak valid.' };
    }
    const trimmed = input.trim();
    if (trimmed.length > maxLength) {
        return { error: `Panjang maksimum ${maxLength} karakter.` };
    }
    return { provided: true, value: trimmed.length ? trimmed : null };
}

function mapActivityRow(row) {
    return {
        id: row.id,
        type: row.activity_type,
        experiment: row.experiment,
        metadata: parseJsonField(row.metadata),
        created_at: row.created_at,
    };
}

async function getProfile(req, res) {
    const userId = req.user.id;
    try {
        const userResult = await db.query(
            'SELECT id, email, full_name, institution, bio, created_at FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        const [progressResult, quizResult, activityResult] = await Promise.all([
            db.query(
                'SELECT experiment, payload, created_at, updated_at FROM user_progress WHERE user_id = $1 ORDER BY updated_at DESC',
                [userId]
            ),
            db.query(
                'SELECT experiment, attempts, correct_count AS correctcount, incorrect_count AS incorrectcount, last_attempt_at FROM user_quiz_stats WHERE user_id = $1 ORDER BY last_attempt_at DESC NULLS LAST',
                [userId]
            ),
            db.query(
                'SELECT id, activity_type, experiment, metadata, created_at FROM user_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
                [userId]
            ),
        ]);

        const progress = progressResult.rows.map((row) => ({
            ...row,
            payload: parseJsonField(row.payload),
        }));

        return res.json({
            user,
            progress,
            quizStats: quizResult.rows,
            activity: activityResult.rows.map(mapActivityRow),
        });
    } catch (error) {
        console.error('Kesalahan saat mengambil profil:', error);
        return res.status(500).json({ message: 'Tidak dapat memuat data profil.' });
    }
}

async function updateProfile(req, res) {
    const userId = req.user.id;
    const fullNameField = sanitizeField(req.body?.fullName, 120);
    const institutionField = sanitizeField(req.body?.institution, 120);
    const bioField = sanitizeField(req.body?.bio, 600);

    if (fullNameField.error || institutionField.error || bioField.error) {
        const message = fullNameField.error || institutionField.error || bioField.error;
        return res.status(400).json({ message });
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (fullNameField.provided) {
        updates.push(`full_name = $${index++}`);
        values.push(fullNameField.value);
    }
    if (institutionField.provided) {
        updates.push(`institution = $${index++}`);
        values.push(institutionField.value);
    }
    if (bioField.provided) {
        updates.push(`bio = $${index++}`);
        values.push(bioField.value);
    }

    if (!updates.length) {
        return res.status(400).json({ message: 'Tidak ada perubahan yang dikirim.' });
    }

    values.push(userId);

    try {
        const result = await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, email, full_name, institution, bio, created_at`,
            values
        );
        const user = result.rows[0];

        const changedFields = [];
        if (fullNameField.provided) changedFields.push('full_name');
        if (institutionField.provided) changedFields.push('institution');
        if (bioField.provided) changedFields.push('bio');

        try {
            await db.query(
                'INSERT INTO user_activity_logs (user_id, activity_type, metadata) VALUES ($1, $2, $3::jsonb)',
                [
                    userId,
                    'profile_update',
                    JSON.stringify({ fields: changedFields, updatedAt: new Date().toISOString() }),
                ]
            );
        } catch (logError) {
            console.warn('Gagal mencatat aktivitas pembaruan profil:', logError.message);
        }

        return res.json({ user });
    } catch (error) {
        console.error('Kesalahan saat memperbarui profil:', error);
        return res.status(500).json({ message: 'Profil tidak dapat diperbarui saat ini.' });
    }
}

async function listActivity(req, res) {
    const userId = req.user.id;
    const limitParam = Number.parseInt(req.query?.limit, 10);
    const typeFilter = typeof req.query?.type === 'string' ? req.query.type.trim() : '';
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const conditions = ['user_id = $1'];
    const values = [userId];
    if (typeFilter) {
        conditions.push('activity_type = $2');
        values.push(typeFilter);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitPlaceholder = `$${values.length + 1}`;

    try {
        const result = await db.query(
            `SELECT id, activity_type, experiment, metadata, created_at
             FROM user_activity_logs
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT ${limitPlaceholder}`,
            [...values, limit]
        );
        return res.json({ activity: result.rows.map(mapActivityRow) });
    } catch (error) {
        console.error('Kesalahan saat mengambil aktivitas:', error);
        return res.status(500).json({ message: 'Riwayat aktivitas tidak dapat dimuat.' });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    listActivity,
};
