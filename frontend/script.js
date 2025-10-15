const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const degToRad = (deg) => deg * (Math.PI / 180);

const STORAGE_TOKEN_KEY = 'vlab_auth_token';
const API_BASE = window.__VLAB_API_BASE__ || '/api';

let authToken = localStorage.getItem(STORAGE_TOKEN_KEY);
let currentUser = null;
let cachedProgress = [];
const quizModules = [];

function registerQuizModule(module) {
    if (module && typeof module.onAuthStateChange === 'function') {
        quizModules.push(module);
    }
}

function formatNumberLocale(value, fractionDigits = 2) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '--';
    return numericValue.toLocaleString('id-ID', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

function decimalStep(decimals) {
    if (!Number.isFinite(decimals) || decimals <= 0) return '1';
    const step = 1 / Math.pow(10, decimals);
    return step.toFixed(decimals);
}

function decimalPlaceholder(decimals) {
    if (!Number.isFinite(decimals) || decimals <= 0) return '0';
    return `0.${'0'.repeat(decimals)}`;
}

const authElements = {
    modal: null,
    loginForm: null,
    registerForm: null,
    authButton: null,
    authCtaButton: null,
    logoutButton: null,
    authStatusMessage: null,
    progressOverviewBody: null,
    progressOverviewList: null,
    progressSummary: null,
    progressMiniList: null,
    progressMiniCopy: null,
    progressMiniCount: null,
    progressMiniLast: null,
    authFeedback: null,
    authModalTitle: null,
    authModalSubtitle: null,
    authToggleText: null,
    authToggleButton: null,
    savedPendulumSummary: null,
    savedFreefallSummary: null,
    savedProjectileSummary: null,
    syncNowButton: null,
};

function setAuthToken(token) {
    if (token) {
        authToken = token;
        localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } else {
        authToken = null;
        localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
}

function toggleModalVisibility(show) {
    const { modal } = authElements;
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function setAuthMode(mode) {
    const { loginForm, registerForm, authModalTitle, authModalSubtitle, authToggleText, authToggleButton, authFeedback } = authElements;
    if (!loginForm || !registerForm) return;
    const isLogin = mode === 'login';
    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);

    if (authModalTitle) {
        authModalTitle.textContent = isLogin ? 'Masuk ke Virtual Lab' : 'Buat Akun Virtual Lab';
    }
    if (authModalSubtitle) {
        authModalSubtitle.textContent = isLogin
            ? 'Gunakan akun Anda untuk menyimpan progres eksperimen.'
            : 'Daftar gratis untuk menyimpan dan menyinkronkan eksperimen.';
    }
    if (authToggleText && authToggleButton) {
        const toggleTextNode = authToggleText.childNodes[0];
        if (isLogin) {
            if (toggleTextNode) toggleTextNode.textContent = 'Belum punya akun? ';
            authToggleButton.textContent = 'Daftar';
            authToggleButton.dataset.mode = 'register';
        } else {
            if (toggleTextNode) toggleTextNode.textContent = 'Sudah punya akun? ';
            authToggleButton.textContent = 'Masuk';
            authToggleButton.dataset.mode = 'login';
        }
    }
    if (authFeedback) authFeedback.textContent = '';
}

function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    toggleModalVisibility(true);
}

function closeAuthModal() {
    toggleModalVisibility(false);
}

async function apiRequest(path, options = {}) {
    const opts = { method: 'GET', ...options };
    opts.headers = { ...(options.headers || {}) };
    if (opts.body && typeof opts.body !== 'string') {
        opts.body = JSON.stringify(opts.body);
        if (!opts.headers['Content-Type']) {
            opts.headers['Content-Type'] = 'application/json';
        }
    }
    if (!opts.headers['Accept']) {
        opts.headers['Accept'] = 'application/json';
    }
    if (authToken) {
        opts.headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, opts);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();
    if (!response.ok) {
        const message = isJson ? (payload.message || payload.error) : payload;
        throw new Error(message || 'Terjadi kesalahan pada server');
    }
    return payload;
}

function updateAuthUI() {
    const {
        authButton,
        authCtaButton,
        logoutButton,
        authStatusMessage,
        syncNowButton,
    } = authElements;

    const isLoggedIn = Boolean(currentUser && authToken);
    if (authButton) {
        authButton.textContent = isLoggedIn ? (currentUser.email || 'Akun Anda') : 'Masuk';
        authButton.classList.toggle('outline', !isLoggedIn);
    }
    if (authCtaButton) {
        authCtaButton.textContent = isLoggedIn ? 'Kelola Akun' : 'Masuk / Daftar';
    }
    if (logoutButton) {
        logoutButton.classList.toggle('hidden', !isLoggedIn);
    }
    if (syncNowButton) {
        syncNowButton.disabled = !isLoggedIn;
        syncNowButton.textContent = isLoggedIn ? 'Sinkronkan Sekarang' : 'Masuk untuk Sinkronisasi';
    }
    if (authStatusMessage) {
        authStatusMessage.textContent = isLoggedIn
            ? `Masuk sebagai ${currentUser.email}. Progres Anda akan tersimpan otomatis.`
            : 'Masuk untuk menyimpan progres eksperimen Anda.';
    }

    if (!isLoggedIn) {
        cachedProgress = [];
    }
    renderProgressUI();
    quizModules.forEach((module) => {
        try {
            module.onAuthStateChange(isLoggedIn);
        } catch (error) {
            console.error('Gagal memperbarui modul quiz:', error);
        }
    });
}

function renderProgressUI() {
    const {
        progressOverviewBody,
        progressOverviewList,
        progressSummary,
        progressMiniList,
        progressMiniCopy,
        progressMiniCount,
        progressMiniLast,
        savedPendulumSummary,
        savedFreefallSummary,
        savedProjectileSummary,
    } = authElements;

    const records = Array.isArray(cachedProgress) ? cachedProgress.slice() : [];
    const total = records.length;
    const sortedRecords = records.slice().sort((a, b) => getUpdatedAtTime(b) - getUpdatedAtTime(a));
    const latestRecord = sortedRecords[0] || null;
    const latestTimestamp = latestRecord ? getUpdatedAtTime(latestRecord) : 0;
    const latestDate = latestTimestamp ? new Date(latestTimestamp) : null;

    if (progressOverviewBody) {
        if (!total) {
            progressOverviewBody.innerHTML = '<tr><td colspan="3">Belum ada progres tersimpan.</td></tr>';
        } else {
            progressOverviewBody.innerHTML = '';
            sortedRecords.forEach((item) => {
                const row = document.createElement('tr');
                const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
                row.innerHTML = `
                    <td>${formatExperimentName(item.experiment)}</td>
                    <td>${createProgressSummary(item)}</td>
                    <td>${updatedAt ? updatedAt.toLocaleString('id-ID') : '-'}</td>
                `;
                progressOverviewBody.appendChild(row);
            });
        }
    }

    if (progressOverviewList) {
        progressOverviewList.innerHTML = '';
        if (!total) {
            const li = document.createElement('li');
            li.textContent = 'Masuk untuk menyimpan eksperimen favorit Anda.';
            progressOverviewList.appendChild(li);
        } else {
            sortedRecords.slice(0, 3).forEach((item) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${formatExperimentName(item.experiment)}</strong> — ${createProgressSummary(item)}`;
                progressOverviewList.appendChild(li);
            });
        }
    }

    if (progressSummary) {
        progressSummary.textContent = total
            ? `Tersimpan ${total.toLocaleString('id-ID')} eksperimen.`
            : 'Belum ada data tersimpan.';
    }

    if (progressMiniCopy) {
        progressMiniCopy.textContent = total
            ? 'Sinkronisasi terbaru tercatat otomatis. Rekap ringkas di bawah.'
            : 'Masuk untuk mulai menyimpan eksperimen dan dapatkan rekap otomatis.';
    }

    if (progressMiniCount) {
        progressMiniCount.textContent = total.toLocaleString('id-ID');
    }

    if (progressMiniLast) {
        progressMiniLast.textContent = latestDate ? latestDate.toLocaleString('id-ID') : '-';
    }

    if (progressMiniList) {
        let highlightItem = progressMiniList.querySelector('[data-slot="recent"]');
        if (total && latestRecord) {
            const summaryText = `${formatExperimentName(latestRecord.experiment)} • ${createProgressSummary(latestRecord)}`;
            if (!highlightItem) {
                highlightItem = document.createElement('li');
                highlightItem.dataset.slot = 'recent';
                progressMiniList.appendChild(highlightItem);
            }
            highlightItem.textContent = `Terbaru: ${summaryText}`;
        } else if (highlightItem) {
            highlightItem.remove();
        }
    }

    updateHeroFeedProgress(sortedRecords);

    if (savedPendulumSummary) {
        const pendulumData = sortedRecords.find((item) => item.experiment === 'pendulum');
        savedPendulumSummary.textContent = pendulumData
            ? createProgressSummary(pendulumData)
            : 'Belum ada progres bandul tersimpan. Jalankan eksperimen untuk merekam hasil.';
    }

    if (savedFreefallSummary) {
        const freefallData = sortedRecords.find((item) => item.experiment === 'freefall');
        savedFreefallSummary.textContent = freefallData
            ? createProgressSummary(freefallData)
            : 'Belum ada progres jatuh bebas tersimpan. Jalankan simulasi untuk merekam data.';
    }

    if (savedProjectileSummary) {
        const projectileData = sortedRecords.find((item) => item.experiment === 'projectile');
        savedProjectileSummary.textContent = projectileData
            ? createProgressSummary(projectileData)
            : 'Belum ada progres gerak parabola tersimpan. Jalankan simulasi untuk mencatat hasil.';
    }
}

function formatExperimentName(experiment) {
    switch (experiment) {
        case 'pendulum':
            return 'Bandul';
        case 'freefall':
            return 'Jatuh Bebas';
        case 'projectile':
            return 'Gerak Parabola';
        default: {
            if (!experiment) return '-';
            return experiment.toString().replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        }
    }
}

function getUpdatedAtTime(record) {
    if (!record || !record.updated_at) return 0;
    const time = new Date(record.updated_at).getTime();
    return Number.isFinite(time) ? time : 0;
}

const heroFeedBaseMessages = [
    { title: 'Bandul', detail: 'g = 9,78 m/s² tercatat otomatis.' },
    { title: 'Jatuh Bebas', detail: 'Objek berhenti di 35 m untuk analisis energi.' },
    { title: 'Gerak Parabola', detail: 'Sudut optimal 43° ditemukan.' },
    { title: 'Bandul', detail: 'Periode rata-rata 1,99 s pada L = 1,2 m.' },
];
let heroFeedElement = null;
let heroFeedProgressEntries = [];
let heroFeedInitialized = false;

const journeyStepDetails = [
    {
        title: 'Pilih Simulasi',
        body: 'Mulai dari landing page atau navigasi atas. Semua modul memiliki kontrol dan layout yang konsisten.',
    },
    {
        title: 'Atur Parameter',
        body: 'Gunakan slider untuk L, sudut, kecepatan, atau gravitasi. Nilai numerik ditampilkan langsung untuk presisi.',
    },
    {
        title: 'Jalankan & Catat',
        body: 'Visualisasi real-time lengkap dengan overlay info dan pencatatan otomatis setiap percobaan.',
    },
    {
        title: 'Sinkronisasi',
        body: 'Masuk untuk menyimpan progres, bandingkan eksperimen, dan lanjutkan di perangkat lain kapan pun.',
    },
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function renderHeroFeed(entries) {
    if (!heroFeedElement) return;
    heroFeedElement.innerHTML = '';
    entries.slice(0, 3).forEach((entry) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="feed-dot"></span><strong>${entry.title}</strong> • ${entry.detail}`;
        heroFeedElement.appendChild(li);
    });
}

function pickHeroFeedBase(count) {
    const pool = heroFeedBaseMessages.slice();
    pool.sort(() => Math.random() - 0.5);
    return pool.slice(0, count);
}

function rotateHeroFeed() {
    if (!heroFeedElement) return;
    const baseCount = Math.max(0, 3 - heroFeedProgressEntries.length);
    const entries = [...heroFeedProgressEntries];
    if (baseCount > 0) {
        entries.push(...pickHeroFeedBase(baseCount));
    }
    if (!entries.length) {
        entries.push(...pickHeroFeedBase(3));
    }
    renderHeroFeed(entries);
}

function initHeroFeed() {
    if (heroFeedInitialized) return;
    heroFeedElement = $('#heroFeed');
    if (!heroFeedElement) return;
    heroFeedInitialized = true;
    const refreshButton = $('#refreshHeroFeed');
    if (refreshButton) {
        refreshButton.addEventListener('click', rotateHeroFeed);
    }
    rotateHeroFeed();
    window.setInterval(rotateHeroFeed, 12000);
}

function updateHeroFeedProgress(records) {
    if (!heroFeedElement) return;
    heroFeedProgressEntries = (records || [])
        .slice(0, 3)
        .map((item) => ({
            title: formatExperimentName(item.experiment),
            detail: createProgressSummary(item),
        }))
        .filter((entry) => entry.detail && entry.detail !== '-');
    rotateHeroFeed();
}

function initQuizModule({
    experiment,
    promptSelector,
    answerSelector,
    submitSelector,
    refreshSelector,
    feedbackSelector,
    statsSelector,
}) {
    const promptEl = $(promptSelector);
    const answerInput = $(answerSelector);
    const submitButton = $(submitSelector);
    const refreshButton = $(refreshSelector);
    const feedbackEl = feedbackSelector ? $(feedbackSelector) : null;
    const statsContainer = statsSelector ? $(statsSelector) : null;

    if (!promptEl || !answerInput || !submitButton || !refreshButton) {
        return null;
    }

    const statsElements = statsContainer
        ? {
              attempts: statsContainer.querySelector('[data-quiz-attr="attempts"]'),
              correct: statsContainer.querySelector('[data-quiz-attr="correct"]'),
              incorrect: statsContainer.querySelector('[data-quiz-attr="incorrect"]'),
          }
        : null;

    const module = {
        experiment,
        promptEl,
        answerInput,
        submitButton,
        refreshButton,
        feedbackEl,
        statsContainer,
        statsElements,
        currentQuestion: null,
        isLoggedIn: false,
        isLoading: false,
        enableControls(enable) {
            const isEnabled = enable && !this.isLoading;
            this.answerInput.disabled = !isEnabled;
            this.submitButton.disabled = !isEnabled;
            this.refreshButton.disabled = !enable;
        },
        setLoading(loading) {
            this.isLoading = loading;
            this.answerInput.disabled = !this.isLoggedIn || loading;
            this.submitButton.disabled = !this.isLoggedIn || loading;
            this.refreshButton.disabled = !this.isLoggedIn || loading;
            if (loading && this.feedbackEl) {
                this.feedbackEl.classList.remove('success', 'error');
                this.feedbackEl.textContent = 'Memproses...';
            }
        },
        setPrompt(text) {
            if (this.promptEl) {
                this.promptEl.textContent = text;
            }
        },
        setFeedback(message, type) {
            if (!this.feedbackEl) return;
            this.feedbackEl.classList.remove('success', 'error');
            if (type) {
                this.feedbackEl.classList.add(type);
            }
            this.feedbackEl.textContent = message || '';
        },
        updateStats(stats) {
            if (!this.statsElements) return;
            const attempts = Number(stats?.attempts) || 0;
            const correct = Number(stats?.correctcount ?? stats?.correct ?? 0);
            const incorrect = Number(stats?.incorrectcount ?? stats?.incorrect ?? 0);
            if (this.statsElements.attempts) {
                this.statsElements.attempts.textContent = attempts.toLocaleString('id-ID');
            }
            if (this.statsElements.correct) {
                this.statsElements.correct.textContent = correct.toLocaleString('id-ID');
            }
            if (this.statsElements.incorrect) {
                this.statsElements.incorrect.textContent = incorrect.toLocaleString('id-ID');
            }
        },
        renderQuestion(question) {
            if (!question) return;
            this.currentQuestion = question;
            const decimals = Number.isFinite(question.answerDecimalPlaces) ? question.answerDecimalPlaces : 2;
            this.setPrompt(question.prompt);
            this.answerInput.step = decimalStep(decimals);
            this.answerInput.placeholder = decimalPlaceholder(decimals);
            if (question.unit) {
                this.answerInput.setAttribute('aria-label', `Jawaban dalam ${question.unit}`);
            }
        },
        async fetchQuestion(force = false) {
            if (!this.isLoggedIn) {
                this.enableControls(false);
                this.setPrompt('Masuk untuk memulai quiz dan simpan hasilnya.');
                return;
            }
            if (this.isLoading && !force) return;
            this.setLoading(true);
            try {
                const data = await apiRequest(`/quiz/${this.experiment}/question`);
                this.renderQuestion(data);
                this.updateStats(data.stats);
                this.answerInput.value = '';
                this.setFeedback('');
            } catch (error) {
                console.error('Gagal mengambil soal quiz:', error);
                this.setFeedback(error.message || 'Tidak dapat mengambil soal.', 'error');
            } finally {
                this.setLoading(false);
            }
        },
        async submitAnswer() {
            if (!this.isLoggedIn) {
                this.setFeedback('Masuk untuk mengirim jawaban.', 'error');
                return;
            }
            if (!this.currentQuestion) {
                await this.fetchQuestion(true);
                if (!this.currentQuestion) return;
            }
            const rawValue = this.answerInput.value.trim().replace(',', '.');
            const numericValue = Number(rawValue);
            if (!Number.isFinite(numericValue)) {
                this.setFeedback('Masukkan jawaban numerik yang valid.', 'error');
                return;
            }
            this.setLoading(true);
            try {
                const result = await apiRequest(`/quiz/${this.experiment}/answer`, {
                    method: 'POST',
                    body: {
                        answer: numericValue,
                        parameters: this.currentQuestion.parameters,
                    },
                });
                const decimals = Number.isFinite(result.answerDecimalPlaces)
                    ? result.answerDecimalPlaces
                    : this.currentQuestion.answerDecimalPlaces || 2;
                const expectedText = formatNumberLocale(result.expectedAnswer, decimals);
                const unitLabel = this.currentQuestion.unit ? ` ${this.currentQuestion.unit}` : '';
                if (result.correct) {
                    this.setFeedback(`Benar! Jawaban yang diharapkan ${expectedText}${unitLabel}.`, 'success');
                } else {
                    const difference = Math.abs(numericValue - result.expectedAnswer);
                    const diffText = formatNumberLocale(difference, Math.min(decimals + 1, 4));
                    this.setFeedback(`Belum tepat. Selisih ${diffText}${unitLabel}. Jawaban seharusnya ${expectedText}${unitLabel}.`, 'error');
                }
                this.updateStats(result.stats);
                if (result.nextQuestion) {
                    this.renderQuestion(result.nextQuestion);
                    this.answerInput.value = '';
                }
            } catch (error) {
                console.error('Gagal mengirim jawaban quiz:', error);
                this.setFeedback(error.message || 'Jawaban tidak dapat dinilai.', 'error');
            } finally {
                this.setLoading(false);
            }
        },
        onAuthStateChange(loggedIn) {
            this.isLoggedIn = Boolean(loggedIn);
            if (!this.isLoggedIn) {
                this.currentQuestion = null;
                this.answerInput.value = '';
                this.enableControls(false);
                this.setPrompt('Masuk untuk memulai quiz dan gunakan simulasi untuk menjawab.');
                this.setFeedback('');
                this.updateStats({ attempts: 0, correct: 0, incorrect: 0 });
                return;
            }
            this.enableControls(true);
            if (!this.currentQuestion) {
                this.fetchQuestion(true);
            }
        },
    };

    submitButton.addEventListener('click', () => module.submitAnswer());
    refreshButton.addEventListener('click', () => module.fetchQuestion(true));
    answerInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            module.submitAnswer();
        }
    });

    registerQuizModule(module);
    module.onAuthStateChange(Boolean(currentUser && authToken));
    return module;
}

function initHeadlineRotator() {
    const lines = $$('.headline-line');
    if (lines.length <= 1) return;
    let index = lines.findIndex((line) => line.classList.contains('is-active'));
    if (index < 0) index = 0;
    setInterval(() => {
        lines[index].classList.remove('is-active');
        index = (index + 1) % lines.length;
        lines[index].classList.add('is-active');
    }, 4200);
}

function initCountupMetrics() {
    const counters = $$('[data-countup]');
    counters.forEach((element) => {
        const target = Number(element.dataset.countup);
        if (!Number.isFinite(target)) return;
        const isPercentage = element.id === 'metricRetention';
        const duration = 1400;
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const value = Math.round(progress * target);
            element.textContent = isPercentage ? `${value}%` : value.toLocaleString('id-ID');
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    });
}

function initJourneySteps() {
    const steps = $$('.journey-step');
    const detailContainer = $('#journeyDetail');
    if (!steps.length || !detailContainer) return;
    const detailTitle = detailContainer.querySelector('h3');
    const detailBody = detailContainer.querySelector('p');

    function activateStep(index) {
        const detail = journeyStepDetails[index] || journeyStepDetails[0];
        steps.forEach((btn, idx) => {
            const isActive = idx === index;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        if (detailTitle) detailTitle.textContent = detail.title;
        if (detailBody) detailBody.textContent = detail.body;
    }

    steps.forEach((step, index) => {
        step.setAttribute('role', 'tab');
        step.setAttribute('aria-selected', step.classList.contains('is-active') ? 'true' : 'false');
        step.setAttribute('tabindex', step.classList.contains('is-active') ? '0' : '-1');
        step.addEventListener('click', () => activateStep(index));
        step.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activateStep(index);
            }
        });
    });

    const initialIndex = steps.findIndex((step) => step.classList.contains('is-active'));
    activateStep(initialIndex >= 0 ? initialIndex : 0);
}

function initLiveStats() {
    const experimentStat = $('#liveStatExperiments');
    const syncStat = $('#liveStatSync');
    const activeStat = $('#liveStatActive');
    const stats = [
        { element: experimentStat, min: 2, max: 6, interval: 5500 },
        { element: syncStat, min: 1, max: 3, interval: 6500 },
        { element: activeStat, min: 1, max: 2, interval: 4800 },
    ];
    stats.forEach((stat) => {
        if (!stat.element) return;
        let currentValue = Number(stat.element.textContent.replace(/[^\d]/g, '')) || 0;
        setInterval(() => {
            currentValue += randomInt(stat.min, stat.max);
            stat.element.textContent = currentValue.toLocaleString('id-ID');
        }, stat.interval + randomInt(0, 1500));
    });
}

function initLandingPageEnhancements() {
    if (!$('#homeHero')) return;
    initHeadlineRotator();
    initCountupMetrics();
    initHeroFeed();
    initJourneySteps();
    initLiveStats();
}

function createProgressSummary(item) {
    if (!item || !item.payload) return '-';
    const formatValue = (value, fractionDigits) => {
        const num = Number(value);
        return Number.isFinite(num) ? num.toFixed(fractionDigits) : '--';
    };
    try {
        const data = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        if (item.experiment === 'pendulum' && data) {
            const length = formatValue(data.L, 2);
            const period = formatValue(data.T, 3);
            const gravity = formatValue(data.g, 3);
            return `L=${length} m, T=${period} s, g=${gravity} m/s²`;
        }
        if (item.experiment === 'freefall' && data) {
            const height = formatValue(data.height ?? data.h, 1);
            const time = formatValue(data.timeOfFlight ?? data.time, 2);
            const impact = formatValue(data.impactVelocity ?? data.velocity, 2);
            return `h=${height} m, t=${time} s, v=${impact} m/s`;
        }
        if (item.experiment === 'projectile' && data) {
            const speed = formatValue(data.speed ?? data.v0, 1);
            const angle = formatValue(data.angle ?? data.theta, 0);
            const range = formatValue(data.range ?? data.distance, 2);
            return `v₀=${speed} m/s, θ=${angle}°, jangkauan=${range} m`;
        }
        if (data.summary) return data.summary;
        return JSON.stringify(data);
    } catch (error) {
        return '-';
    }
}

async function loadCurrentUser() {
    if (!authToken) {
        currentUser = null;
        updateAuthUI();
        return;
    }
    try {
        const data = await apiRequest('/me');
        currentUser = data.user || null;
    } catch (error) {
        console.warn('Token tidak valid, menghapus sesi.', error.message);
        setAuthToken(null);
        currentUser = null;
    }
    updateAuthUI();
}

async function loadProgress(force = false) {
    if (!currentUser || !authToken) return;
    if (!force && cachedProgress.length > 0) {
        renderProgressUI();
        return;
    }
    try {
        const data = await apiRequest('/progress');
        cachedProgress = data.records || data.progress || [];
        renderProgressUI();
    } catch (error) {
        console.error('Gagal memuat progres:', error.message);
        if (authElements.authFeedback) authElements.authFeedback.textContent = error.message;
    }
}

async function recordProgress(experiment, payload) {
    if (!currentUser || !authToken) return;
    try {
        await apiRequest('/progress', {
            method: 'POST',
            body: { experiment, payload },
        });
        await loadProgress(true);
    } catch (error) {
        console.error('Gagal menyimpan progres:', error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const { loginForm, authFeedback } = authElements;
    if (!loginForm) return;
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: { email, password },
        });
        setAuthToken(data.token);
        currentUser = data.user;
        closeAuthModal();
        updateAuthUI();
        await loadProgress(true);
    } catch (error) {
        if (authFeedback) authFeedback.textContent = error.message;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const { registerForm, authFeedback, loginForm } = authElements;
    if (!registerForm) return;
    const formData = new FormData(registerForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');
    if (password !== passwordConfirm) {
        if (authFeedback) authFeedback.textContent = 'Konfirmasi kata sandi tidak sama.';
        return;
    }
    try {
        await apiRequest('/register', {
            method: 'POST',
            body: { email, password },
        });
        if (authFeedback) authFeedback.textContent = 'Registrasi berhasil. Silakan masuk.';
        setAuthMode('login');
        if (loginForm) {
            const emailInput = loginForm.querySelector('[name="email"]');
            if (emailInput) emailInput.value = email;
        }
    } catch (error) {
        if (authFeedback) authFeedback.textContent = error.message;
    }
}

function logoutUser() {
    setAuthToken(null);
    currentUser = null;
    cachedProgress = [];
    updateAuthUI();
}

function initAuth() {
    authElements.modal = $('#authModal');
    authElements.loginForm = $('#loginForm');
    authElements.registerForm = $('#registerForm');
    authElements.authButton = $('#authButton');
    authElements.authCtaButton = $('#authCtaButton');
    authElements.logoutButton = $('#logoutButton');
    authElements.authStatusMessage = $('#authStatusMessage');
    authElements.progressOverviewBody = $('#progressOverviewBody');
    authElements.progressOverviewList = $('#progressOverviewList');
    authElements.progressSummary = $('#progressSummary');
    authElements.progressMiniList = $('#progressMiniList');
    authElements.progressMiniCopy = $('#progressMiniCopy');
    authElements.progressMiniCount = $('#progressMiniCount');
    authElements.progressMiniLast = $('#progressMiniLast');
    authElements.authFeedback = $('#authFeedback');
    authElements.authModalTitle = $('#authModalTitle');
    authElements.authModalSubtitle = $('#authModalSubtitle');
    authElements.authToggleText = $('#authToggleText');
    authElements.authToggleButton = $('#authToggleButton');
    authElements.savedPendulumSummary = $('#savedPendulumSummary');
    authElements.savedFreefallSummary = $('#savedFreefallSummary');
    authElements.savedProjectileSummary = $('#savedProjectileSummary');
    authElements.syncNowButton = $('#syncNowButton');

    const closeAuthModalBtn = $('#closeAuthModal');

    if (authElements.loginForm) authElements.loginForm.addEventListener('submit', handleLogin);
    if (authElements.registerForm) authElements.registerForm.addEventListener('submit', handleRegister);
    if (authElements.authButton) authElements.authButton.addEventListener('click', () => openAuthModal('login'));
    if (authElements.authCtaButton) authElements.authCtaButton.addEventListener('click', () => openAuthModal('login'));
    if (authElements.logoutButton) authElements.logoutButton.addEventListener('click', logoutUser);
    if (authElements.authToggleButton) {
        authElements.authToggleButton.addEventListener('click', () => {
            const nextMode = authElements.authToggleButton.dataset.mode || 'register';
            setAuthMode(nextMode);
        });
    }
    $$('[data-open-auth]').forEach((trigger) => {
        trigger.addEventListener('click', () => openAuthModal('login'));
    });
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);
    if (authElements.modal) {
        authElements.modal.addEventListener('click', (event) => {
            if (event.target === authElements.modal) closeAuthModal();
        });
    }
    if (authElements.syncNowButton) {
        authElements.syncNowButton.addEventListener('click', () => loadProgress(true));
    }

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAuthModal();
    });
}

function initPendulum() {
    const canvas = $('#pendulumCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const center = { x: canvas.width / 2, y: 100 };

    let L = parseFloat($('#lengthSlider')?.value ?? 1.0);
    let theta = parseFloat($('#angleSlider')?.value ?? 15);
    let omega = 0;
    let isRunning = true;
    let isExperimenting = false;
    let oscillationCount = 0;
    let startTime = 0;
    const targetOscillations = 10;
    let animationFrameId;
    let lastAngleSign = 0;
    const gConst = 9.81;

    const lengthSlider = $('#lengthSlider');
    const angleSlider = $('#angleSlider');
    const massSlider = $('#massSlider');
    const startStopButton = $('#startStopButton');
    const resetButton = $('#resetButton');
    const clearDataButton = $('#clearDataButton');
    const displayL = $('#displayL');
    const displayT = $('#displayT');
    const currentLength = $('#currentLength');
    const currentAngle = $('#currentAngle');
    const currentMass = $('#currentMass');
    const resultsTableBody = $('#resultsTableBody');
    const avgGValue = $('#avgGValue');

    let dataLog = [];

    function drawPendulum(currentL, currentTheta) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bobRadius = 25;
        const pendulumLengthPx = currentL * 200;
        const x = center.x + pendulumLengthPx * Math.sin(currentTheta);
        const y = center.y + pendulumLengthPx * Math.cos(currentTheta);

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(x, y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#6c757d';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(center.x, center.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#002b5c';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, bobRadius, 0, 2 * Math.PI);
        const gradient = ctx.createRadialGradient(
            x - bobRadius * 0.3, y - bobRadius * 0.3, bobRadius * 0.2,
            x, y, bobRadius
        );
        gradient.addColorStop(0, '#0dcaf0');
        gradient.addColorStop(1, '#0a58ca');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#1b2a4e';
        ctx.stroke();
    }

    function updatePendulumPhysics() {
        if (!isRunning) return;
        const dt = 0.02;
        const alpha = (-gConst / L) * Math.sin(degToRad(theta));
        omega += alpha * dt;
        theta += omega * dt * (180 / Math.PI);
        omega *= 0.9995;
    }

    function updateDisplays() {
        if (displayL) displayL.textContent = L.toFixed(2);
        if (displayT) displayT.textContent = isExperimenting ? ((performance.now() - startTime) / 1000).toFixed(2) : '0.00';
        if (currentLength) currentLength.textContent = `${L.toFixed(2)} m`;
        if (currentAngle && angleSlider) currentAngle.textContent = `${parseFloat(angleSlider.value).toFixed(0)}°`;
        if (currentMass && massSlider) currentMass.textContent = `${parseFloat(massSlider.value).toFixed(1)} kg`;
    }

    function animate() {
        updatePendulumPhysics();
        drawPendulum(L, degToRad(theta));
        updateDisplays();

        if (isExperimenting) {
            const currentAngleSign = Math.sign(degToRad(theta));
            if (currentAngleSign !== 0 && currentAngleSign !== lastAngleSign) {
                oscillationCount += 0.5;
                if (oscillationCount >= targetOscillations) endExperiment();
                lastAngleSign = currentAngleSign;
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function startExperiment() {
        if (isExperimenting) return;
        isExperimenting = true;
        oscillationCount = 0;
        startTime = performance.now();
        if (startStopButton) {
            startStopButton.textContent = 'Mengukur...';
            startStopButton.disabled = true;
        }
        if (resetButton) resetButton.disabled = true;
        if (lengthSlider) lengthSlider.disabled = true;
        if (angleSlider) angleSlider.disabled = true;
        if (angleSlider) theta = parseFloat(angleSlider.value);
        omega = 0;
        lastAngleSign = Math.sign(degToRad(theta));
        isRunning = true;
    }

    function endExperiment() {
        const endTime = performance.now();
        const totalTimeSeconds = (endTime - startTime) / 1000;
        const periodT = totalTimeSeconds / targetOscillations;
        const calculatedG = (4 * Math.PI * Math.PI * L) / (periodT * periodT);

        dataLog.push({ L, T10: totalTimeSeconds, T: periodT, g: calculatedG });
        updateResultsTable();
        updateAverageG();
        recordProgress('pendulum', {
            L,
            T10: totalTimeSeconds,
            T: periodT,
            g: calculatedG,
            capturedAt: new Date().toISOString(),
        });

        isExperimenting = false;
        if (startStopButton) {
            startStopButton.textContent = `Mulai Eksperimen (${targetOscillations} osilasi)`;
            startStopButton.disabled = false;
        }
        if (resetButton) resetButton.disabled = false;
        if (lengthSlider) lengthSlider.disabled = false;
        if (angleSlider) angleSlider.disabled = false;
    }

    function resetPendulumSimulation() {
        if (isExperimenting) {
            isExperimenting = false;
            if (startStopButton) {
                startStopButton.textContent = `Mulai Eksperimen (${targetOscillations} osilasi)`;
                startStopButton.disabled = false;
            }
            if (resetButton) resetButton.disabled = false;
            if (lengthSlider) lengthSlider.disabled = false;
            if (angleSlider) angleSlider.disabled = false;
        }
        if (lengthSlider) L = parseFloat(lengthSlider.value);
        if (angleSlider) theta = parseFloat(angleSlider.value);
        omega = 0;
        isRunning = true;
        drawPendulum(L, degToRad(theta));
        updateDisplays();
    }

    function clearPendulumData() {
        dataLog = [];
        updateResultsTable();
        updateAverageG();
    }

    function updateResultsTable() {
        if (!resultsTableBody) return;
        resultsTableBody.innerHTML = '';
        dataLog.forEach((data, index) => {
            const row = resultsTableBody.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = data.L.toFixed(2);
            row.insertCell().textContent = data.T10.toFixed(2);
            row.insertCell().textContent = data.T.toFixed(3);
            row.insertCell().textContent = data.g.toFixed(3);
        });
    }

    function updateAverageG() {
        if (!avgGValue) return;
        if (dataLog.length === 0) {
            avgGValue.textContent = '--';
            return;
        }
        const sumG = dataLog.reduce((total, data) => total + data.g, 0);
        const avgG = sumG / dataLog.length;
        avgGValue.textContent = avgG.toFixed(4);
    }

    if (lengthSlider) {
        lengthSlider.addEventListener('input', () => {
            L = parseFloat(lengthSlider.value);
            resetPendulumSimulation();
        });
    }
    if (angleSlider) {
        angleSlider.addEventListener('input', () => {
            theta = parseFloat(angleSlider.value);
            resetPendulumSimulation();
        });
    }
    if (massSlider) {
        massSlider.addEventListener('input', () => {
            if (currentMass) currentMass.textContent = `${parseFloat(massSlider.value).toFixed(1)} kg`;
        });
    }
    if (startStopButton) startStopButton.addEventListener('click', startExperiment);
    if (resetButton) resetButton.addEventListener('click', resetPendulumSimulation);
    if (clearDataButton) clearDataButton.addEventListener('click', clearPendulumData);

    initQuizModule({
        experiment: 'pendulum',
        promptSelector: '#pendulumQuizPrompt',
        answerSelector: '#pendulumQuizAnswer',
        submitSelector: '#pendulumQuizSubmit',
        refreshSelector: '#pendulumQuizRefresh',
        feedbackSelector: '#pendulumQuizFeedback',
        statsSelector: '#pendulumQuizStats',
    });

    resetPendulumSimulation();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animate);
}

function initFreeFall() {
    const canvas = $('#freefallCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const hSlider = $('#ffHeight');
    const mSlider = $('#ffMass');
    const gSlider = $('#ffGravity');
    const hVal = $('#ffHeightVal');
    const mVal = $('#ffMassVal');
    const gVal = $('#ffGravityVal');
    const btnStart = $('#ffStart');
    const btnPause = $('#ffPause');
    const btnReset = $('#ffReset');
    const posSpan = $('#ffPos');
    const velSpan = $('#ffVel');
    const timeSpan = $('#ffTime');

    let height = parseFloat(hSlider?.value ?? 20);
    let gravity = parseFloat(gSlider?.value ?? 9.81);
    let y = height;
    let velocity = 0;
    let elapsed = 0;
    let running = false;
    let paused = false;
    let lastTimestamp = 0;
    let animationFrameId = null;
    const maxDisplayHeight = parseFloat(hSlider?.max ?? 100);
    const topMargin = 60;
    const groundMargin = 60;
    let activeRun = null;

    function updatePauseButton() {
        if (!btnPause) return;
        if (!running) {
            btnPause.disabled = true;
            btnPause.textContent = 'Pause';
        } else {
            btnPause.disabled = false;
            btnPause.textContent = paused ? 'Lanjutkan' : 'Pause';
        }
    }

    function drawFreeFall() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#d0e7ff';
        ctx.fillRect(0, canvas.height - groundMargin, canvas.width, groundMargin);

        const usableHeightPx = canvas.height - groundMargin - topMargin;
        const pxPerMeter = usableHeightPx / Math.max(maxDisplayHeight, 1);
        const clampedY = Math.max(0, Math.min(y, maxDisplayHeight));
        const yPx = canvas.height - groundMargin - clampedY * pxPerMeter;

        ctx.strokeStyle = '#9ec5fe';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height - groundMargin);
        ctx.lineTo(canvas.width / 2, topMargin);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(canvas.width / 2, yPx, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#0a58ca';
        ctx.fill();

        if (posSpan) posSpan.textContent = y.toFixed(2);
        if (velSpan) velSpan.textContent = Math.abs(velocity).toFixed(2);
        if (timeSpan) timeSpan.textContent = elapsed.toFixed(2);
    }

    function step(timestamp) {
        if (!running) {
            animationFrameId = null;
            return;
        }

        if (paused) {
            animationFrameId = requestAnimationFrame(step);
            return;
        }

        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;

        velocity -= gravity * dt;
        y += velocity * dt;
        elapsed += dt;

        if (y <= 0) {
            const runSnapshot = activeRun;
            const baselineHeight = runSnapshot ? runSnapshot.height : height;
            const baselineGravity = runSnapshot ? runSnapshot.gravity : gravity;
            const massValue = runSnapshot ? runSnapshot.mass : parseFloat(mSlider?.value ?? 1);
            if (runSnapshot) {
                const impactVelocity = Math.sqrt(Math.max(0, 2 * baselineGravity * baselineHeight));
                recordProgress('freefall', {
                    height: baselineHeight,
                    mass: Number.isFinite(massValue) ? massValue : 1,
                    gravity: baselineGravity,
                    timeOfFlight: elapsed,
                    impactVelocity,
                    capturedAt: new Date().toISOString(),
                });
                activeRun = null;
            }
            y = 0;
            velocity = 0;
            running = false;
            paused = false;
            updatePauseButton();
        }

        drawFreeFall();
        if (running) {
            animationFrameId = requestAnimationFrame(step);
        } else {
            animationFrameId = null;
        }
    }

    function reset() {
        height = parseFloat(hSlider?.value ?? height);
        gravity = parseFloat(gSlider?.value ?? gravity);
        if (hVal) hVal.textContent = `${height.toFixed(0)} m`;
        if (mVal && mSlider) mVal.textContent = `${parseFloat(mSlider.value).toFixed(1)} kg`;
        if (gVal) gVal.textContent = `${gravity.toFixed(2)} m/s²`;

        y = height;
        velocity = 0;
        elapsed = 0;
        running = false;
        paused = false;
        lastTimestamp = 0;
        activeRun = null;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        drawFreeFall();
        updatePauseButton();
    }

    function togglePause() {
        if (!running) return;
        paused = !paused;
        if (!paused) {
            lastTimestamp = 0;
        }
        updatePauseButton();
        drawFreeFall();
    }

    if (hSlider) hSlider.addEventListener('input', reset);
    if (mSlider) mSlider.addEventListener('input', () => {
        if (mVal) mVal.textContent = `${parseFloat(mSlider.value).toFixed(1)} kg`;
    });
    if (gSlider) gSlider.addEventListener('input', reset);
    if (btnStart) btnStart.addEventListener('click', () => {
        if (running) return;
        reset();
        height = parseFloat(hSlider?.value ?? height);
        gravity = parseFloat(gSlider?.value ?? gravity);
        const massValue = parseFloat(mSlider?.value ?? 1);
        activeRun = {
            height,
            mass: Number.isFinite(massValue) ? massValue : 1,
            gravity,
            startedAt: new Date().toISOString(),
        };
        running = true;
        paused = false;
        updatePauseButton();
        lastTimestamp = 0;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(step);
    });
    if (btnPause) btnPause.addEventListener('click', togglePause);
    if (btnReset) btnReset.addEventListener('click', reset);

    initQuizModule({
        experiment: 'freefall',
        promptSelector: '#freefallQuizPrompt',
        answerSelector: '#freefallQuizAnswer',
        submitSelector: '#freefallQuizSubmit',
        refreshSelector: '#freefallQuizRefresh',
        feedbackSelector: '#freefallQuizFeedback',
        statsSelector: '#freefallQuizStats',
    });

    reset();
}

function initProjectile() {
    const canvas = $('#projectileCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const vSlider = $('#projSpeed');
    const aSlider = $('#projAngle');
    const gSlider = $('#projGravity');
    const vVal = $('#projSpeedVal');
    const aVal = $('#projAngleVal');
    const gVal = $('#projGravityVal');
    const btnStart = $('#projStart');
    const btnReset = $('#projReset');
    const timeSpan = $('#projTime');
    const rangeSpan = $('#projRange');
    const hmaxSpan = $('#projHmax');

    let speed = parseFloat(vSlider?.value ?? 40);
    let angle = parseFloat(aSlider?.value ?? 45);
    let gravity = parseFloat(gSlider?.value ?? 9.81);
    let running = false;
    let lastTimestamp = 0;
    let elapsed = 0;
    let trail = [];
    let activeRun = null;

    function calculateDerivedValues() {
        const angleRad = degToRad(angle);
        const vx = speed * Math.cos(angleRad);
        const vy = speed * Math.sin(angleRad);
        const tFlight = (2 * vy) / gravity;
        const expectedRange = vx * tFlight;
        const expectedHmax = (vy * vy) / (2 * gravity);
        return { angleRad, vx, vy, tFlight, expectedRange, expectedHmax };
    }

    function drawProjectile(x = 0, y = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#d0e7ff';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        const { expectedRange, expectedHmax } = calculateDerivedValues();
        let trailMaxX = Math.max(x, 0);
        let trailMaxY = Math.max(y, 0);
        trail.forEach((point) => {
            if (point.x > trailMaxX) trailMaxX = point.x;
            if (point.y > trailMaxY) trailMaxY = point.y;
        });

        const fitRange = Math.max(expectedRange, trailMaxX, 10) * 1.1;
        const fitHmax = Math.max(expectedHmax, trailMaxY, 5) * 1.2;
        const pxPerMeterX = (canvas.width - 40) / fitRange;
        const pxPerMeterY = (canvas.height - 40) / fitHmax;

        if (trail.length > 1) {
            ctx.strokeStyle = '#0a58ca';
            ctx.lineWidth = 2;
            ctx.beginPath();
            trail.forEach((point, index) => {
                const xPx = 20 + point.x * pxPerMeterX;
                const yPx = canvas.height - 20 - point.y * pxPerMeterY;
                if (index === 0) ctx.moveTo(xPx, yPx);
                else ctx.lineTo(xPx, yPx);
            });
            ctx.stroke();
        }

        if (running) {
            const xPx = 20 + x * pxPerMeterX;
            const yPx = canvas.height - 20 - y * pxPerMeterY;
            ctx.beginPath();
            ctx.arc(xPx, yPx, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#0dcaf0';
            ctx.fill();
        }

        if (timeSpan) timeSpan.textContent = elapsed.toFixed(2);
        if (rangeSpan) rangeSpan.textContent = expectedRange.toFixed(2);
        if (hmaxSpan) hmaxSpan.textContent = expectedHmax.toFixed(2);
    }

    function step(timestamp) {
        if (!running) return;
        if (!lastTimestamp) lastTimestamp = timestamp;
        let dt = (timestamp - lastTimestamp) / 1000;
        dt = Math.min(0.05, Math.max(dt, 0.016));
        lastTimestamp = timestamp;
        elapsed += dt;

        const { angleRad, vx, vy } = calculateDerivedValues();
        const x = vx * elapsed;
        const y = vy * elapsed - 0.5 * gravity * elapsed * elapsed;

        if (y <= 0 && elapsed > 0) {
            const landingX = vx * elapsed;
            trail.push({ x: landingX, y: 0 });
            drawProjectile(landingX, 0);
            if (activeRun) {
                recordProgress('projectile', {
                    speed: activeRun.speed,
                    angle: activeRun.angle,
                    gravity: activeRun.gravity,
                    timeOfFlight: elapsed,
                    range: landingX,
                    maxHeight: activeRun.expectedHmax,
                    expectedRange: activeRun.expectedRange,
                    capturedAt: new Date().toISOString(),
                });
                activeRun = null;
            }
            running = false;
            return;
        }

        trail.push({ x, y });
        drawProjectile(x, y);
        if (running) requestAnimationFrame(step);
    }

    function updateDisplay() {
        if (vVal) vVal.textContent = `${speed.toFixed(0)} m/s`;
        if (aVal) aVal.textContent = `${angle.toFixed(0)}°`;
        if (gVal) gVal.textContent = `${gravity.toFixed(2)} m/s²`;
        elapsed = 0;
        trail = [];
        running = false;
        lastTimestamp = 0;
        activeRun = null;
        drawProjectile(0, 0);
    }

    if (vSlider) vSlider.addEventListener('input', () => {
        speed = parseFloat(vSlider.value);
        updateDisplay();
    });
    if (aSlider) aSlider.addEventListener('input', () => {
        angle = parseFloat(aSlider.value);
        updateDisplay();
    });
    if (gSlider) gSlider.addEventListener('input', () => {
        gravity = parseFloat(gSlider.value);
        updateDisplay();
    });

    if (btnStart) btnStart.addEventListener('click', () => {
        if (running) return;
        const derived = calculateDerivedValues();
        activeRun = {
            speed,
            angle,
            gravity,
            expectedRange: derived.expectedRange,
            expectedHmax: derived.expectedHmax,
            expectedFlightTime: derived.tFlight,
            startedAt: new Date().toISOString(),
        };
        elapsed = 0;
        trail = [];
        running = true;
        lastTimestamp = 0;
        requestAnimationFrame(step);
    });

    if (btnReset) btnReset.addEventListener('click', updateDisplay);

    initQuizModule({
        experiment: 'projectile',
        promptSelector: '#projectileQuizPrompt',
        answerSelector: '#projectileQuizAnswer',
        submitSelector: '#projectileQuizSubmit',
        refreshSelector: '#projectileQuizRefresh',
        feedbackSelector: '#projectileQuizFeedback',
        statsSelector: '#projectileQuizStats',
    });

    updateDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initPendulum();
    initFreeFall();
    initProjectile();
    initLandingPageEnhancements();
    loadCurrentUser().then(() => loadProgress(true));
});
