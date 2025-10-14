// Utility helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const degToRad = (deg) => deg * (Math.PI / 180);

// Authentication & API helpers
const STORAGE_TOKEN_KEY = 'vlab_auth_token';
const API_BASE = '/api';
let authToken = localStorage.getItem(STORAGE_TOKEN_KEY);
let currentUser = null;
let cachedProgress = [];

// Auth-related DOM elements
let authModal;
let loginForm;
let registerForm;
let authButton;
let authCtaButton;
let logoutButton;
let authStatusMessage;
let progressOverviewBody;
let progressSummary;
let authFeedback;
let authModalTitle;
let authModalSubtitle;
let authToggleText;
let authToggleButton;
let savedPendulumSummary;
let syncNowButton;

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
    if (!authModal) return;
    if (show) {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function setAuthMode(mode) {
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
    const isLoggedIn = Boolean(currentUser && authToken);
    if (authButton) {
        authButton.textContent = isLoggedIn ? currentUser.email : 'Masuk';
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
        renderProgressUI();
    } else {
        renderProgressUI();
    }
}

function renderProgressUI() {
    if (!progressOverviewBody) return;
    if (!Array.isArray(cachedProgress) || cachedProgress.length === 0) {
        progressOverviewBody.innerHTML = '<tr><td colspan="3">Belum ada progres tersimpan.</td></tr>';
        if (progressSummary) progressSummary.textContent = 'Belum ada data tersimpan.';
        if (savedPendulumSummary) {
            savedPendulumSummary.textContent = 'Masuk untuk menyimpan dan melihat progres eksperimen.';
        }
        return;
    }

    progressOverviewBody.innerHTML = '';
    cachedProgress.forEach((item) => {
        const row = document.createElement('tr');
        const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
        const summary = createProgressSummary(item);
        row.innerHTML = `
            <td>${item.experiment}</td>
            <td>${summary}</td>
            <td>${updatedAt ? updatedAt.toLocaleString('id-ID') : '-'}</td>
        `;
        progressOverviewBody.appendChild(row);
    });

    if (progressSummary) {
        progressSummary.textContent = `Tersimpan ${cachedProgress.length} eksperimen.`;
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
            return `L=${Number(data.L).toFixed(2)} m, T=${Number(data.T).toFixed(3)} s, g=${Number(data.g).toFixed(3)} m/s²`;
        }
        return data.summary || JSON.stringify(data);
    } catch (err) {
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
    } catch (err) {
        console.warn('Token tidak valid, menghapus sesi.', err);
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
    } catch (err) {
        console.error('Gagal memuat progres:', err.message);
        if (authFeedback) authFeedback.textContent = err.message;
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
    } catch (err) {
        console.error('Gagal menyimpan progres:', err.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
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
        await loadProgress(true);
        updateAuthUI();
        closeAuthModal();
    } catch (err) {
        if (authFeedback) authFeedback.textContent = err.message;
    }
}

async function handleRegister(event) {
    event.preventDefault();
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
            loginForm.querySelector('[name="email"]').value = email;
        }
    } catch (err) {
        if (authFeedback) authFeedback.textContent = err.message;
    }
}

function logoutUser() {
    setAuthToken(null);
    currentUser = null;
    cachedProgress = [];
    updateAuthUI();
}

// Pendulum global variables
let pCanvas, pCtx, pCenter;
let L = 1.0; // pendulum length
let theta = 15; // angle in degrees
let omega = 0; // angular velocity
let isRunning = false;
let gConst = 9.81; // gravity constant

// Experiment tracking
let isExperimenting = false;
let oscillationCount = 0;
let startTime = 0;
let targetOscillations = 10;
let animationFrameId;
let lastAngleSign = 0;

// UI elements
let lengthSlider, angleSlider, startStopButton, resetButton;
let displayL, displayT;
let dataLog = [];
let resultsTableBody, avgGValue;

// View Navigation
    function drawProjectile(x, y, opts = {}) {
        // opts: { previewTrail, isPreview }
        projCtx.clearRect(0, 0, projCanvas.width, projCanvas.height);
        // ground
        projCtx.fillStyle = '#d0e7ff';
        projCtx.fillRect(0, projCanvas.height - 20, projCanvas.width, 20);
        // Expected scale from controls
        const vx = projSpeed * Math.cos(degToRad(projAngle));
        const vy = projSpeed * Math.sin(degToRad(projAngle));
        const tFlight = (2 * vy) / projGravity;
        const expectedRange = vx * tFlight;
        const expectedHmax = (vy * vy) / (2 * projGravity);
        // Actual trail bounds to auto-zoom out if needed
        let trailMaxX = x;
        let trailMaxY = y;
        let trail = opts.previewTrail || projTrail;
        for (let i = 0; i < trail.length; i++) {
            const p = trail[i];
            if (p.x > trailMaxX) trailMaxX = p.x;
            if (p.y > trailMaxY) trailMaxY = p.y;
        }
        const fitRange = Math.max(expectedRange, trailMaxX, 1) * 1.05; // add margin
        const fitHmax = Math.max(expectedHmax, trailMaxY, 1) * 1.10;   // add margin
        const pxPerMeterX = (projCanvas.width - 40) / fitRange;
        const pxPerMeterY = (projCanvas.height - 40) / fitHmax;

        // preview trajectory (dashed line)
        if (opts.isPreview && trail.length > 1) {
            projCtx.save();
            projCtx.setLineDash([8, 8]);
            projCtx.strokeStyle = '#0a58ca88';
            projCtx.lineWidth = 2;
            projCtx.beginPath();
            for (let i = 0; i < trail.length; i++) {
                const p = trail[i];
                const xPx = 20 + p.x * pxPerMeterX;
                const yPx = projCanvas.height - 20 - p.y * pxPerMeterY;
                if (i === 0) projCtx.moveTo(xPx, yPx); else projCtx.lineTo(xPx, yPx);
            }
            projCtx.stroke();
            projCtx.restore();
        }

        // Projectile simulation variables
        let projAngle = 45;
        let projSpeed = 20;
        let projGravity = 9.8;
        let projT = 0;
        let projTrail = [];
        let projAnim = false;

        // Helper: calculate preview trajectory points
        function getPreviewTrajectory() {
            const points = [];
            const vx = projSpeed * Math.cos(degToRad(projAngle));
            const vy = projSpeed * Math.sin(degToRad(projAngle));
            const tFlight = (2 * vy) / projGravity;
            const dt = tFlight / 60;
            for (let t = 0; t <= tFlight; t += dt) {
                const x = vx * t;
                const y = vy * t - 0.5 * projGravity * t * t;
                if (y < 0) break;
                points.push({ x, y });
            }
            return points;
        }

        // Reset projectile state (no preview)
        function resetProjectile() {
            projT = 0;
            projTrail = [];
            projAnim = false;
            drawProjectile(0, 0, { previewTrail: [], isPreview: false });
        }

        // Update state when sliders change (do not show trajectory)
        document.getElementById('proj-angle').addEventListener('input', function(e) {
            projAngle = parseFloat(e.target.value);
            if (aVal) aVal.textContent = projAngle + '°';
            projT = 0;
            projTrail = [];
            projAnim = false;
            drawProjectile(0, 0, { previewTrail: [], isPreview: false });
        });
        document.getElementById('proj-speed').addEventListener('input', function(e) {
            projSpeed = parseFloat(e.target.value);
            if (vVal) vVal.textContent = projSpeed + ' m/s';
            projT = 0;
            projTrail = [];
            projAnim = false;
            drawProjectile(0, 0, { previewTrail: [], isPreview: false });
        });
        document.getElementById('proj-gravity').addEventListener('input', function(e) {
            projGravity = parseFloat(e.target.value);
            if (gVal) gVal.textContent = projGravity.toFixed(2) + ' m/s²';
            projT = 0;
            projTrail = [];
            projAnim = false;
            drawProjectile(0, 0, { previewTrail: [], isPreview: false });
        });

        // Tembak button event
        document.getElementById('proj-fire').addEventListener('click', function() {
            projT = 0;
            projTrail = [];
            projAnim = true;
            animateProjectile();
        });

        // Animate projectile (ball and solid trail)
        function animateProjectile() {
            if (!projAnim) return;
            const vx = projSpeed * Math.cos(degToRad(projAngle));
            const vy = projSpeed * Math.sin(degToRad(projAngle));
            const dt = 0.02;
            projT += dt;
            const x = vx * projT;
            const y = vy * projT - 0.5 * projGravity * projT * projT;
            if (y < 0) {
                projAnim = false;
                drawProjectile(x, 0);
                return;
            }
            projTrail.push({ x, y });
            drawProjectile(x, y);
            requestAnimationFrame(animateProjectile);
        }

        // Initial state
        resetProjectile();
}

function drawPendulum(currentL, currentTheta) {
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

    const bobRadius = 25;
    const pendulumLengthPx = currentL * 200;
    const x = pCenter.x + pendulumLengthPx * Math.sin(currentTheta);
    const y = pCenter.y + pendulumLengthPx * Math.cos(currentTheta);

    // Rope
    pCtx.beginPath();
    pCtx.moveTo(pCenter.x, pCenter.y);
    pCtx.lineTo(x, y);
    pCtx.lineWidth = 2;
    pCtx.strokeStyle = '#6c757d';
    pCtx.stroke();

    // Pivot
    pCtx.beginPath();
    pCtx.arc(pCenter.x, pCenter.y, 5, 0, 2 * Math.PI);
    pCtx.fillStyle = '#002b5c';
    pCtx.fill();

    // Bob
    pCtx.beginPath();
    pCtx.arc(x, y, bobRadius, 0, 2 * Math.PI);
    const gradient = pCtx.createRadialGradient(
        x - bobRadius * 0.3, y - bobRadius * 0.3, bobRadius * 0.2,
        x, y, bobRadius
    );
    gradient.addColorStop(0, '#0dcaf0');
    gradient.addColorStop(1, '#0a58ca');
    pCtx.fillStyle = gradient;
    pCtx.fill();
    pCtx.lineWidth = 1;
    pCtx.strokeStyle = '#1b2a4e';
    pCtx.stroke();
}

function updatePendulumPhysics() {
    if (!isRunning) return;
    const dt = 0.02;
    const alpha = (-gConst / L) * Math.sin(degToRad(theta));
    omega += alpha * dt;
    theta += omega * dt * (180 / Math.PI);
    omega *= 0.9995; // small damping for realism
}

function animatePendulum() {
    updatePendulumPhysics();
    drawPendulum(L, degToRad(theta));

    if (displayL) displayL.textContent = L.toFixed(2);
    if (displayT) displayT.textContent = (isExperimenting ? (performance.now() - startTime) / 1000 : 0).toFixed(2);

    if (isExperimenting) {
        const currentAngleSign = Math.sign(degToRad(theta));
        if (currentAngleSign !== 0 && currentAngleSign !== lastAngleSign) {
            oscillationCount += 0.5;
            if (oscillationCount >= targetOscillations) {
                endExperiment();
            }
            lastAngleSign = currentAngleSign;
        }
    }

    animationFrameId = requestAnimationFrame(animatePendulum);
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
        if (startStopButton) startStopButton.textContent = `Mulai Eksperimen (${targetOscillations} osilasi)`;
        if (startStopButton) startStopButton.disabled = false;
        if (resetButton) resetButton.disabled = false;
        if (lengthSlider) lengthSlider.disabled = false;
        if (angleSlider) angleSlider.disabled = false;
    }
    if (lengthSlider) L = parseFloat(lengthSlider.value);
    if (angleSlider) theta = parseFloat(angleSlider.value);
    omega = 0;
    isRunning = true;
    if (pCtx) drawPendulum(L, degToRad(theta));
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
    const sumG = dataLog.reduce((sum, data) => sum + data.g, 0);
    const avgG = sumG / dataLog.length;
    avgGValue.textContent = avgG.toFixed(4);
}

// -----------------
// Free Fall (Jatuh Bebas)
// -----------------
let ffInitialized = false;
let ffCanvas, ffCtx;
let ffHeight = 20; // meters
let ffMass = 1.0; // kg (not used in ideal)
let ffGravity = 9.81; // m/s^2
let ffY = 0; // position from ground
let ffV = 0; // velocity
let ffT = 0; // time
let ffRunning = false;
let ffLastTs = 0;

function initFreeFallOnce() {
    if (ffInitialized) return;
    ffInitialized = true;

    ffCanvas = document.getElementById('freefallCanvas');
    if (!ffCanvas) return;
    ffCtx = ffCanvas.getContext('2d');

    const hSlider = document.getElementById('ffHeight');
    const mSlider = document.getElementById('ffMass');
    const gSlider = document.getElementById('ffGravity');
    const hVal = document.getElementById('ffHeightVal');
    const mVal = document.getElementById('ffMassVal');
    const gVal = document.getElementById('ffGravityVal');
    const btnStart = document.getElementById('ffStart');
    const btnReset = document.getElementById('ffReset');
    const posSpan = document.getElementById('ffPos');
    const velSpan = document.getElementById('ffVel');
    const timeSpan = document.getElementById('ffTime');

    function drawFreeFall() {
        ffCtx.clearRect(0, 0, ffCanvas.width, ffCanvas.height);
        // ground line
        ffCtx.fillStyle = '#d0e7ff';
        ffCtx.fillRect(0, ffCanvas.height - 20, ffCanvas.width, 20);
        // object
        const pxPerMeter = (ffCanvas.height - 40) / Math.max(ffHeight, 1);
        const yPx = ffCanvas.height - 20 - ffY * pxPerMeter;
        ffCtx.beginPath();
        ffCtx.arc(ffCanvas.width / 2, yPx, 15, 0, Math.PI * 2);
        ffCtx.fillStyle = '#0a58ca';
        ffCtx.fill();

        posSpan.textContent = ffY.toFixed(2);
        velSpan.textContent = ffV.toFixed(2);
        timeSpan.textContent = ffT.toFixed(2);
    }

    function stepFreeFall(ts) {
        if (!ffRunning) return;
        if (!ffLastTs) ffLastTs = ts;
        const dt = Math.min(0.05, (ts - ffLastTs) / 1000);
        ffLastTs = ts;
        // Physics: start at height, fall downward: y(t) = h - 0.5 g t^2
        ffV -= ffGravity * dt; // downward acceleration reduces height (v negative)
        ffY += ffV * dt; // update position above ground
        ffT += dt;
        if (ffY <= 0) {
            ffY = 0;
            ffRunning = false;
        }
        drawFreeFall();
        if (ffRunning) requestAnimationFrame(stepFreeFall);
    }

    function resetFF() {
        ffHeight = parseFloat(hSlider.value);
        ffMass = parseFloat(mSlider.value);
        ffGravity = parseFloat(gSlider.value);
        hVal.textContent = `${ffHeight} m`;
        mVal.textContent = `${ffMass.toFixed(1)} kg`;
    gVal.textContent = `${ffGravity.toFixed(2)} m/s²`;
    ffY = ffHeight; ffV = 0; ffT = 0; ffRunning = false; ffLastTs = 0;
        drawFreeFall();
    }

    hSlider.addEventListener('input', resetFF);
    mSlider.addEventListener('input', resetFF);
    gSlider.addEventListener('input', resetFF);
    btnStart.addEventListener('click', () => {
        if (!ffRunning) {
            ffRunning = true; ffLastTs = 0; requestAnimationFrame(stepFreeFall);
        }
    });
    btnReset.addEventListener('click', resetFF);

    resetFF();
}

// -----------------
// Projectile (Meriam)
// -----------------
let projInitialized = false;
let projCanvas, projCtx;
let projSpeed = 40; // m/s
let projAngle = 45; // deg
let projGravity = 9.81; // m/s^2
let projRunning = false;
let projT = 0;
let projLastTs = 0;
let projTrail = [];

function initProjectileOnce() {
    if (projInitialized) return;
    projInitialized = true;

    projCanvas = document.getElementById('projectileCanvas');
    if (!projCanvas) return;
    projCtx = projCanvas.getContext('2d');

    const vSlider = document.getElementById('projSpeed');
    const aSlider = document.getElementById('projAngle');
    const gSlider = document.getElementById('projGravity');
    const vVal = document.getElementById('projSpeedVal');
    const aVal = document.getElementById('projAngleVal');
    const gVal = document.getElementById('projGravityVal');
    const btnStart = document.getElementById('projStart');
    const btnReset = document.getElementById('projReset');
    const timeSpan = document.getElementById('projTime');
    const rangeSpan = document.getElementById('projRange');
    const hmaxSpan = document.getElementById('projHmax');

    // Update slider values and display immediately
    function updateProjectileDisplay() {
        projSpeed = parseFloat(vSlider.value);
        projAngle = parseFloat(aSlider.value);
        projGravity = parseFloat(gSlider.value);
        
        if (vVal) vVal.textContent = `${projSpeed} m/s`;
        if (aVal) aVal.textContent = `${projAngle}°`;
        if (gVal) gVal.textContent = `${projGravity.toFixed(2)} m/s²`;
        
        // Update calculations display
        const angleRad = degToRad(projAngle);
        const vx = projSpeed * Math.cos(angleRad);
        const vy = projSpeed * Math.sin(angleRad);
        const tFlight = (2 * vy) / projGravity;
        const expectedRange = vx * tFlight;
        const expectedHmax = (vy * vy) / (2 * projGravity);
        
        if (timeSpan) timeSpan.textContent = "0.00";
        if (rangeSpan) rangeSpan.textContent = expectedRange.toFixed(2);
        if (hmaxSpan) hmaxSpan.textContent = expectedHmax.toFixed(2);
    }

    function drawProjectile(x, y) {
        projCtx.clearRect(0, 0, projCanvas.width, projCanvas.height);
        
        // ground
        projCtx.fillStyle = '#d0e7ff';
        projCtx.fillRect(0, projCanvas.height - 20, projCanvas.width, 20);
        
        // Calculate expected range for auto-zoom
        const angleRad = degToRad(projAngle);
        const vx = projSpeed * Math.cos(angleRad);
        const vy = projSpeed * Math.sin(angleRad);
        const tFlight = (2 * vy) / projGravity;
        const expectedRange = vx * tFlight;
        const expectedHmax = (vy * vy) / (2 * projGravity);
        
        // Auto-zoom bounds
        let trailMaxX = Math.max(x, 0);
        let trailMaxY = Math.max(y, 0);
        for (let i = 0; i < projTrail.length; i++) {
            const p = projTrail[i];
            if (p.x > trailMaxX) trailMaxX = p.x;
            if (p.y > trailMaxY) trailMaxY = p.y;
        }
        
        const fitRange = Math.max(expectedRange, trailMaxX, 10) * 1.1;
        const fitHmax = Math.max(expectedHmax, trailMaxY, 5) * 1.2;
        const pxPerMeterX = (projCanvas.width - 40) / fitRange;
        const pxPerMeterY = (projCanvas.height - 40) / fitHmax;

        // Draw trail only if there are points
        if (projTrail.length > 1) {
            projCtx.strokeStyle = '#0a58ca';
            projCtx.lineWidth = 2;
            projCtx.beginPath();
            for (let i = 0; i < projTrail.length; i++) {
                const p = projTrail[i];
                const xPx = 20 + p.x * pxPerMeterX;
                const yPx = projCanvas.height - 20 - p.y * pxPerMeterY;
                if (i === 0) projCtx.moveTo(xPx, yPx); 
                else projCtx.lineTo(xPx, yPx);
            }
            projCtx.stroke();
        }

        // Draw projectile current point only if in flight
        if (projRunning && typeof x === 'number' && typeof y === 'number') {
            const xPx = 20 + x * pxPerMeterX;
            const yPx = projCanvas.height - 20 - y * pxPerMeterY;
            projCtx.beginPath();
            projCtx.arc(xPx, yPx, 6, 0, Math.PI * 2);
            projCtx.fillStyle = '#0dcaf0';
            projCtx.fill();
        }
        
        // Update time display
        if (timeSpan) timeSpan.textContent = projT.toFixed(2);
    }

    function stepProjectile(ts) {
        if (!projRunning) return;
        
        if (!projLastTs) projLastTs = ts;
        let dt = (ts - projLastTs) / 1000;
        if (dt <= 0) dt = 0.016; // fallback for first frame
        dt = Math.min(0.05, dt); // cap dt to prevent large jumps
        projLastTs = ts;
        
        projT += dt;
        
        // Physics calculation
        const angleRad = degToRad(projAngle);
        const vx = projSpeed * Math.cos(angleRad);
        const vy = projSpeed * Math.sin(angleRad);
        const x = vx * projT;
        const y = vy * projT - 0.5 * projGravity * projT * projT;
        
        // Check if projectile has landed
        if (y <= 0 && projT > 0) {
            // Final position at ground level
            const finalX = vx * projT;
            projTrail.push({ x: finalX, y: 0 });
            drawProjectile(finalX, 0);
            projRunning = false;
            return;
        }
        
        // Add point to trail and draw
        projTrail.push({ x, y });
        drawProjectile(x, y);
        
        if (projRunning) requestAnimationFrame(stepProjectile);
    }

    function resetProj() {
        projRunning = false;
        projT = 0;
        projLastTs = 0;
        projTrail = [];
        updateProjectileDisplay();
        drawProjectile(0, 0);
    }

    // Set up event listeners for sliders
    if (vSlider) {
        vSlider.addEventListener('input', updateProjectileDisplay);
    }
    if (aSlider) {
        aSlider.addEventListener('input', updateProjectileDisplay);
    }
    if (gSlider) {
        gSlider.addEventListener('input', updateProjectileDisplay);
    }

    // Fire button
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (projRunning) return; // prevent multiple starts
            projT = 0;
            projLastTs = 0;
            projTrail = [];
            projRunning = true;
            requestAnimationFrame(stepProjectile);
        });
    }

    // Reset button  
    if (btnReset) {
        btnReset.addEventListener('click', resetProj);
    }

    // Initialize display
    resetProj();
}

// View switching logic
function switchView(viewName) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('active');
    // Optionally, re-init simulation if needed
    if (viewName === 'pendulum') {
        // Initialize pendulum simulation
        if (!pCanvas) {
            pCanvas = document.getElementById('pendulumCanvas');
            if (pCanvas) {
                pCtx = pCanvas.getContext('2d');
                pCenter = { x: pCanvas.width / 2, y: 100 };
                
                // Initialize UI elements
                lengthSlider = document.getElementById('lengthSlider');
                angleSlider = document.getElementById('angleSlider');
                startStopButton = document.getElementById('startStopButton');
                resetButton = document.getElementById('resetButton');
                displayL = document.getElementById('displayL');
                displayT = document.getElementById('displayT');
                resultsTableBody = document.getElementById('resultsTableBody');
                avgGValue = document.getElementById('avgGValue');
                
                // Set up event listeners
                if (lengthSlider) {
                    lengthSlider.addEventListener('input', resetPendulumSimulation);
                }
                if (angleSlider) {
                    angleSlider.addEventListener('input', resetPendulumSimulation);
                }
                if (startStopButton) {
                    startStopButton.addEventListener('click', startExperiment);
                }
                if (resetButton) {
                    resetButton.addEventListener('click', resetPendulumSimulation);
                }
                
                // Initialize values
                if (lengthSlider) L = parseFloat(lengthSlider.value);
                if (angleSlider) theta = parseFloat(angleSlider.value);
                omega = 0;
            }
        }
        
        // Start animation
        isRunning = true;
        drawPendulum(L, degToRad(theta));
        if (!animationFrameId && typeof animatePendulum === 'function') {
            animatePendulum();
        }
    } else if (viewName === 'freefall') {
        initFreeFallOnce();
    } else if (viewName === 'projectile') {
        initProjectileOnce();
    }
}

// Add click listeners for nav and landing cards
document.addEventListener('DOMContentLoaded', () => {
    authModal = $('#authModal');
    loginForm = $('#loginForm');
    registerForm = $('#registerForm');
    authButton = $('#authButton');
    authCtaButton = $('#authCtaButton');
    logoutButton = $('#logoutButton');
    authStatusMessage = $('#authStatusMessage');
    progressOverviewBody = $('#progressOverviewBody');
    progressSummary = $('#progressSummary');
    authFeedback = $('#authFeedback');
    authModalTitle = $('#authModalTitle');
    authModalSubtitle = $('#authModalSubtitle');
    authToggleText = $('#authToggleText');
    authToggleButton = $('#authToggleButton');
    savedPendulumSummary = $('#savedPendulumSummary');
    syncNowButton = $('#syncNowButton');

    const closeAuthModalBtn = $('#closeAuthModal');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (authButton) authButton.addEventListener('click', () => openAuthModal('login'));
    if (authCtaButton) authCtaButton.addEventListener('click', () => openAuthModal('login'));
    if (logoutButton) logoutButton.addEventListener('click', logoutUser);
    if (authToggleButton) authToggleButton.addEventListener('click', () => {
        const nextMode = authToggleButton.dataset.mode || 'register';
        setAuthMode(nextMode);
    });
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);
    if (authModal) {
        authModal.addEventListener('click', (event) => {
            if (event.target === authModal) closeAuthModal();
        });
    }
    if (syncNowButton) syncNowButton.addEventListener('click', () => loadProgress(true));

    // Initial view
    switchView('landing');
    // All elements with [data-view]
    $$('[data-view]').forEach(el => {
        el.addEventListener('click', e => {
            const view = el.getAttribute('data-view');
            if (view) switchView(view);
        });
    });

    loadCurrentUser().then(() => loadProgress(true));
});
