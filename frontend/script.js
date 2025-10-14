const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const degToRad = (deg) => deg * (Math.PI / 180);

const STORAGE_TOKEN_KEY = 'vlab_auth_token';
const API_BASE = window.__VLAB_API_BASE__ || '/api';

let authToken = localStorage.getItem(STORAGE_TOKEN_KEY);
let currentUser = null;
let cachedProgress = [];

const authElements = {
    modal: null,
    loginForm: null,
    registerForm: null,
    authButton: null,
    authCtaButton: null,
    logoutButton: null,
    authStatusMessage: null,
    progressOverviewBody: null,
    progressSummary: null,
    authFeedback: null,
    authModalTitle: null,
    authModalSubtitle: null,
    authToggleText: null,
    authToggleButton: null,
    savedPendulumSummary: null,
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
}

function renderProgressUI() {
    const { progressOverviewBody, progressSummary, savedPendulumSummary } = authElements;
    if (progressOverviewBody) {
        if (!Array.isArray(cachedProgress) || cachedProgress.length === 0) {
            progressOverviewBody.innerHTML = '<tr><td colspan="3">Belum ada progres tersimpan.</td></tr>';
        } else {
            progressOverviewBody.innerHTML = '';
            cachedProgress.forEach((item) => {
                const row = document.createElement('tr');
                const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
                row.innerHTML = `
                    <td>${item.experiment}</td>
                    <td>${createProgressSummary(item)}</td>
                    <td>${updatedAt ? updatedAt.toLocaleString('id-ID') : '-'}</td>
                `;
                progressOverviewBody.appendChild(row);
            });
        }
    }

    if (progressSummary) {
        if (!cachedProgress.length) {
            progressSummary.textContent = 'Belum ada data tersimpan.';
        } else {
            progressSummary.textContent = `Tersimpan ${cachedProgress.length} eksperimen.`;
        }
    }

    if (savedPendulumSummary) {
        const pendulumData = cachedProgress.find((item) => item.experiment === 'pendulum');
        savedPendulumSummary.textContent = pendulumData
            ? createProgressSummary(pendulumData)
            : 'Belum ada progres bandul tersimpan. Jalankan eksperimen untuk merekam hasil.';
    }
}

function createProgressSummary(item) {
    if (!item || !item.payload) return '-';
    try {
        const data = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        if (item.experiment === 'pendulum' && data) {
            const length = Number(data.L).toFixed(2);
            const period = Number(data.T).toFixed(3);
            const gravity = Number(data.g).toFixed(3);
            return `L=${length} m, T=${period} s, g=${gravity} m/s²`;
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
    authElements.progressSummary = $('#progressSummary');
    authElements.authFeedback = $('#authFeedback');
    authElements.authModalTitle = $('#authModalTitle');
    authElements.authModalSubtitle = $('#authModalSubtitle');
    authElements.authToggleText = $('#authToggleText');
    authElements.authToggleButton = $('#authToggleButton');
    authElements.savedPendulumSummary = $('#savedPendulumSummary');
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
    let lastTimestamp = 0;

    function drawFreeFall() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#d0e7ff';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        const pxPerMeter = (canvas.height - 40) / Math.max(height, 1);
        const yPx = canvas.height - 20 - y * pxPerMeter;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, yPx, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#0a58ca';
        ctx.fill();

        if (posSpan) posSpan.textContent = y.toFixed(2);
        if (velSpan) velSpan.textContent = velocity.toFixed(2);
        if (timeSpan) timeSpan.textContent = elapsed.toFixed(2);
    }

    function step(timestamp) {
        if (!running) return;
        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;

        velocity -= gravity * dt;
        y += velocity * dt;
        elapsed += dt;

        if (y <= 0) {
            y = 0;
            running = false;
        }

        drawFreeFall();
        if (running) requestAnimationFrame(step);
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
        lastTimestamp = 0;
        drawFreeFall();
    }

    if (hSlider) hSlider.addEventListener('input', reset);
    if (mSlider) mSlider.addEventListener('input', () => {
        if (mVal) mVal.textContent = `${parseFloat(mSlider.value).toFixed(1)} kg`;
    });
    if (gSlider) gSlider.addEventListener('input', reset);
    if (btnStart) btnStart.addEventListener('click', () => {
        if (!running) {
            running = true;
            lastTimestamp = 0;
            requestAnimationFrame(step);
        }
    });
    if (btnReset) btnReset.addEventListener('click', reset);

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
            trail.push({ x: vx * elapsed, y: 0 });
            drawProjectile(vx * elapsed, 0);
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
        elapsed = 0;
        trail = [];
        running = true;
        lastTimestamp = 0;
        requestAnimationFrame(step);
    });

    if (btnReset) btnReset.addEventListener('click', updateDisplay);

    updateDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initPendulum();
    initFreeFall();
    initProjectile();
    loadCurrentUser().then(() => loadProgress(true));
});
