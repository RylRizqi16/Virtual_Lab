const express = require('express');
const cors = require('cors');
const { register, login, getMe, authMiddleware } = require('./controllers/authController');
const { listProgress, saveProgress } = require('./controllers/progressController');
const { getQuizQuestion, submitQuizAnswer, listQuizStats } = require('./controllers/quizController');
const { getProfile, updateProfile, listActivity } = require('./controllers/profileController');
const { PORT, CLIENT_ORIGIN } = require('./config/env');
require('./config/database');

const app = express();

if (CLIENT_ORIGIN === '*') {
    app.use(cors());
} else {
    app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
}

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/register', register);
app.post('/api/login', login);
app.get('/api/me', authMiddleware, getMe);
app.get('/api/profile', authMiddleware, getProfile);
app.put('/api/profile', authMiddleware, updateProfile);
app.get('/api/activity', authMiddleware, listActivity);
app.get('/api/progress', authMiddleware, listProgress);
app.post('/api/progress', authMiddleware, saveProgress);
app.get('/api/quiz/:experiment/question', authMiddleware, getQuizQuestion);
app.post('/api/quiz/:experiment/answer', authMiddleware, submitQuizAnswer);
app.get('/api/quiz/stats', authMiddleware, listQuizStats);

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan yang tidak terduga.' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
