const db = require('../config/database');

const EXPERIMENT_CONFIG = {
    pendulum: {
        unit: 's',
        answerDecimalPlaces: 2,
        tolerance: (expected) => Math.max(0.05, expected * 0.02),
        generateQuestion: () => {
            const length = sampleRange(0.5, 2.5, 0.05, 2);
            const gravity = 9.81;
            return {
                prompt: `Dengan panjang tali L = ${formatNumber(length, 2)} m, berapakah periode satu ayunan (dalam detik) untuk bandul sederhana pada g = 9,81 m/s²?`,
                parameters: { length, gravity },
            };
        },
        computeExpected: ({ length, gravity }) => {
            const L = Number(length);
            const g = Number(gravity);
            if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(g) || g <= 0) {
                throw new Error('INVALID_PARAMETERS');
            }
            return 2 * Math.PI * Math.sqrt(L / g);
        },
    },
    freefall: {
        unit: 's',
        answerDecimalPlaces: 2,
        tolerance: (expected) => Math.max(0.06, expected * 0.03),
        generateQuestion: () => {
            const height = sampleRange(8, 90, 1, 0);
            const gravity = sampleRange(7, 12, 0.1, 1);
            return {
                prompt: `Sebuah benda dijatuhkan dari ketinggian h = ${formatNumber(height, 0)} m pada lingkungan dengan g = ${formatNumber(gravity, 1)} m/s² (abaikan hambatan udara). Berapa waktu yang dibutuhkan hingga mencapai tanah?`,
                parameters: { height, gravity },
            };
        },
        computeExpected: ({ height, gravity }) => {
            const h = Number(height);
            const g = Number(gravity);
            if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(g) || g <= 0) {
                throw new Error('INVALID_PARAMETERS');
            }
            return Math.sqrt((2 * h) / g);
        },
    },
    projectile: {
        unit: 'm',
        answerDecimalPlaces: 2,
        tolerance: (expected) => Math.max(0.12, expected * 0.03),
        generateQuestion: () => {
            const speed = sampleRange(20, 90, 1, 0);
            const angle = sampleRange(25, 70, 1, 0);
            const gravity = sampleRange(8, 11, 0.1, 1);
            return {
                prompt: `Sebuah proyektil ditembakkan dengan kecepatan awal v₀ = ${formatNumber(speed, 0)} m/s dan sudut θ = ${formatNumber(angle, 0)}°. Berapa jangkauan horizontal maksimum (dalam meter) jika g = ${formatNumber(gravity, 1)} m/s²?`,
                parameters: { speed, angle, gravity },
            };
        },
        computeExpected: ({ speed, angle, gravity }) => {
            const v0 = Number(speed);
            const theta = Number(angle);
            const g = Number(gravity);
            if (!Number.isFinite(v0) || v0 <= 0 || !Number.isFinite(theta) || !Number.isFinite(g) || g <= 0) {
                throw new Error('INVALID_PARAMETERS');
            }
            const angleRad = (theta * Math.PI) / 180;
            return (v0 * v0 * Math.sin(2 * angleRad)) / g;
        },
    },
};

function sampleRange(min, max, step, decimals) {
    const steps = Math.round((max - min) / step);
    const index = Math.floor(Math.random() * (steps + 1));
    const value = min + index * step;
    return Number(value.toFixed(typeof decimals === 'number' ? decimals : 6));
}

function formatNumber(value, decimals) {
    return Number(value).toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function buildQuestionPayload(experiment, config, question) {
    return {
        experiment,
        prompt: question.prompt,
        parameters: question.parameters,
        unit: config.unit,
        answerDecimalPlaces: config.answerDecimalPlaces,
    };
}

async function fetchStats(userId, experiment) {
    const result = await db.query(
        'SELECT attempts, correct_count AS correctcount, incorrect_count AS incorrectcount, last_attempt_at FROM user_quiz_stats WHERE user_id = $1 AND experiment = $2',
        [userId, experiment]
    );
    if (!result.rows.length) {
        return { attempts: 0, correctcount: 0, incorrectcount: 0, last_attempt_at: null };
    }
    return result.rows[0];
}

async function getQuizQuestion(req, res) {
    const experiment = req.params.experiment;
    const config = EXPERIMENT_CONFIG[experiment];
    if (!config) {
        return res.status(404).json({ message: 'Eksperimen tidak ditemukan.' });
    }

    try {
        const question = config.generateQuestion();
        const stats = await fetchStats(req.user.id, experiment);
        return res.json({
            ...buildQuestionPayload(experiment, config, question),
            stats,
        });
    } catch (error) {
        console.error('Kesalahan saat membuat soal quiz:', error);
        return res.status(500).json({ message: 'Tidak dapat membuat soal quiz saat ini.' });
    }
}

async function submitQuizAnswer(req, res) {
    const experiment = req.params.experiment;
    const config = EXPERIMENT_CONFIG[experiment];
    if (!config) {
        return res.status(404).json({ message: 'Eksperimen tidak ditemukan.' });
    }

    const { parameters, answer } = req.body || {};
    const numericAnswer = Number(answer);
    if (!parameters || !Number.isFinite(numericAnswer)) {
        return res.status(400).json({ message: 'Parameter soal dan jawaban numerik wajib diisi.' });
    }

    let expected;
    try {
        expected = config.computeExpected(parameters);
    } catch (error) {
        if (error.message === 'INVALID_PARAMETERS') {
            return res.status(400).json({ message: 'Parameter soal tidak valid.' });
        }
        console.error('Gagal menghitung jawaban quiz:', error);
        return res.status(500).json({ message: 'Gagal mengevaluasi jawaban.' });
    }

    const tolerance = config.tolerance(expected);
    const isCorrect = Math.abs(numericAnswer - expected) <= tolerance;
    const correctDelta = isCorrect ? 1 : 0;
    const incorrectDelta = isCorrect ? 0 : 1;

    try {
        const statsResult = await db.query(
            `INSERT INTO user_quiz_stats (user_id, experiment, attempts, correct_count, incorrect_count, last_attempt_at)
             VALUES ($1, $2, 1, $3, $4, NOW())
             ON CONFLICT (user_id, experiment)
             DO UPDATE SET
                 attempts = user_quiz_stats.attempts + 1,
                 correct_count = user_quiz_stats.correct_count + EXCLUDED.correct_count,
                 incorrect_count = user_quiz_stats.incorrect_count + EXCLUDED.incorrect_count,
                 last_attempt_at = NOW()
             RETURNING attempts, correct_count AS correctcount, incorrect_count AS incorrectcount;
            `,
            [req.user.id, experiment, correctDelta, incorrectDelta]
        );

        const nextQuestion = config.generateQuestion();
        return res.json({
            correct: isCorrect,
            expectedAnswer: Number(expected.toFixed(config.answerDecimalPlaces + 2)),
            answerDecimalPlaces: config.answerDecimalPlaces,
            tolerance,
            stats: statsResult.rows[0],
            nextQuestion: buildQuestionPayload(experiment, config, nextQuestion),
        });
    } catch (error) {
        console.error('Kesalahan saat mencatat hasil quiz:', error);
        return res.status(500).json({ message: 'Jawaban tidak dapat disimpan saat ini.' });
    }
}

async function listQuizStats(req, res) {
    try {
        const result = await db.query(
            'SELECT experiment, attempts, correct_count AS correctcount, incorrect_count AS incorrectcount, last_attempt_at FROM user_quiz_stats WHERE user_id = $1 ORDER BY experiment',
            [req.user.id]
        );
        return res.json({ stats: result.rows });
    } catch (error) {
        console.error('Kesalahan saat mengambil statistik quiz:', error);
        return res.status(500).json({ message: 'Tidak dapat mengambil statistik quiz.' });
    }
}

module.exports = {
    getQuizQuestion,
    submitQuizAnswer,
    listQuizStats,
};
