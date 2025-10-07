const canvas = document.getElementById('pendulumCanvas');
const ctx = canvas.getContext('2d');
const center = { x: canvas.width / 2, y: 50 };

let L = 1.0;
const g = 9.81;
let theta = 10;
let omega = 0;
const initialThetaDeg = 10;

const degToRad = (deg) => deg * (Math.PI / 180);

let animationFrameId;
let isRunning = true;
let isExperimenting = false;
let oscillationCount = 0;
let startTime = 0;
const targetOscillations = 10;
let lastAngleSign = Math.sign(degToRad(theta));
let dataLog = [];

const lengthSlider = document.getElementById('lengthSlider');
const angleSlider = document.getElementById('angleSlider');
const massSlider = document.getElementById('massSlider');
const currentLengthSpan = document.getElementById('currentLength');
const currentAngleSpan = document.getElementById('currentAngle');
const currentMassSpan = document.getElementById('currentMass');
const startStopButton = document.getElementById('startStopButton');
const resetButton = document.getElementById('resetButton');
const clearDataButton = document.getElementById('clearDataButton');
const resultsTableBody = document.getElementById('resultsTableBody');
const displayT = document.getElementById('displayT');
const displayL = document.getElementById('displayL');
const avgGValue = document.getElementById('avgGValue');

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
    ctx.fillStyle = 'black';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, bobRadius, 0, 2 * Math.PI);

    const gradient = ctx.createRadialGradient(
        x - bobRadius * 0.3, y - bobRadius * 0.3, bobRadius * 0.2,
        x, y, bobRadius
    );
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#1E8449');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#383838';
    ctx.stroke();
}

function updatePhysics() {
    if (!isRunning) return;

    const dt = 0.02;

    const alpha = (-g / L) * Math.sin(degToRad(theta));

    omega += alpha * dt;

    theta += omega * dt * (180 / Math.PI);

    omega *= 0.9995;
}

function animate() {
    updatePhysics();
    drawPendulum(L, degToRad(theta));

    displayL.textContent = L.toFixed(2);
    displayT.textContent = (isExperimenting ? (performance.now() - startTime) / 1000 : 0).toFixed(2);

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

    animationFrameId = requestAnimationFrame(animate);
}

function startExperiment() {
    if (isExperimenting) return;

    isExperimenting = true;
    oscillationCount = 0;
    startTime = performance.now();
    startStopButton.textContent = 'Mengukur...';
    startStopButton.disabled = true;
    resetButton.disabled = true;
    lengthSlider.disabled = true;
    angleSlider.disabled = true;

    theta = parseFloat(angleSlider.value);
    omega = 0;
    lastAngleSign = Math.sign(degToRad(theta));
    isRunning = true;
}

function endExperiment() {
    const endTime = performance.now();
    const totalTimeSeconds = (endTime - startTime) / 1000;

    const periodT = totalTimeSeconds / targetOscillations;
    const calculatedG = (4 * Math.PI * Math.PI * L) / (periodT * periodT);

    dataLog.push({
        L: L,
        T10: totalTimeSeconds,
        T: periodT,
        g: calculatedG
    });

    updateResultsTable();
    updateAverageG();

    isExperimenting = false;
    startStopButton.textContent = `Mulai Eksperimen (${targetOscillations} osilasi)`;
    startStopButton.disabled = false;
    resetButton.disabled = false;
    lengthSlider.disabled = false;
    angleSlider.disabled = false;
}

function resetSimulation() {
    if (isExperimenting) {
        isExperimenting = false;
        startStopButton.textContent = `Mulai Eksperimen (${targetOscillations} osilasi)`;
        startStopButton.disabled = false;
        resetButton.disabled = false;
        lengthSlider.disabled = false;
        angleSlider.disabled = false;
    }

    L = parseFloat(lengthSlider.value);
    theta = parseFloat(angleSlider.value);
    omega = 0;
    isRunning = true;

    drawPendulum(L, degToRad(theta));
}

function clearData() {
    dataLog = [];
    updateResultsTable();
    updateAverageG();
}

function updateResultsTable() {
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
    if (dataLog.length === 0) {
        avgGValue.textContent = '--';
        return;
    }
    const sumG = dataLog.reduce((sum, data) => sum + data.g, 0);
    const avgG = sumG / dataLog.length;
    avgGValue.textContent = avgG.toFixed(4);
}

lengthSlider.addEventListener('input', (e) => {
    L = parseFloat(e.target.value);
    currentLengthSpan.textContent = L.toFixed(2) + ' m';
    displayL.textContent = L.toFixed(2);
    resetSimulation();
});

angleSlider.addEventListener('input', (e) => {
    theta = parseFloat(e.target.value);
    currentAngleSpan.textContent = theta.toFixed(0) + '\u00b0';
    drawPendulum(L, degToRad(theta));
});

massSlider.addEventListener('input', (e) => {
    currentMassSpan.textContent = parseFloat(e.target.value).toFixed(1) + ' kg';
});

startStopButton.addEventListener('click', startExperiment);
resetButton.addEventListener('click', resetSimulation);
clearDataButton.addEventListener('click', clearData);

function initialize() {
    L = parseFloat(lengthSlider.value);
    theta = parseFloat(angleSlider.value);

    resetSimulation();
    animate();
}

initialize();
