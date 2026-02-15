// ============================
// AllieGolf - Putting Simulator
// ============================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const strokeCountEl = document.getElementById('stroke-count');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('reset-btn');
const hintEl = document.getElementById('hint');

// --- Canvas sizing ---
const BASE_WIDTH = 400;
const BASE_HEIGHT = 600;

function resizeCanvas() {
    const maxW = Math.min(window.innerWidth - 32, 460);
    const scale = maxW / BASE_WIDTH;
    const w = Math.floor(BASE_WIDTH * scale);
    const h = Math.floor(BASE_HEIGHT * scale);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    initPositions();
});

// --- Game state ---
let ball, hole, strokes, isDragging, dragStart, dragEnd, gameOver, ballSinking, sinkTimer;

const BALL_RADIUS_RATIO = 0.022;
const HOLE_RADIUS_RATIO = 0.035;
const FRICTION = 0.985;
const MIN_SPEED = 0.15;
const MAX_POWER = 18;
const DRAG_SCALE = 0.12;

function scl() {
    return canvas.width / BASE_WIDTH;
}

function initPositions() {
    const s = scl();
    ball = {
        x: canvas.width / 2,
        y: canvas.height * 0.78,
        vx: 0,
        vy: 0,
        radius: Math.max(6, BALL_RADIUS_RATIO * canvas.width),
    };
    hole = {
        x: canvas.width / 2,
        y: canvas.height * 0.18,
        radius: Math.max(10, HOLE_RADIUS_RATIO * canvas.width),
    };
}

function resetGame() {
    initPositions();
    strokes = 0;
    isDragging = false;
    dragStart = null;
    dragEnd = null;
    gameOver = false;
    ballSinking = false;
    sinkTimer = 0;
    strokeCountEl.textContent = '0';
    messageEl.classList.add('hidden');
    messageEl.textContent = '';
    resetBtn.classList.add('hidden');
    hintEl.style.display = '';
}

resetGame();

// --- Input helpers ---
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
    };
}

function ballIsMoving() {
    return Math.abs(ball.vx) > MIN_SPEED || Math.abs(ball.vy) > MIN_SPEED;
}

function distTo(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// --- Input events ---
function onPointerDown(e) {
    if (gameOver || ballIsMoving() || ballSinking) return;
    const pos = getPointerPos(e);
    const dist = distTo(pos.x, pos.y, ball.x, ball.y);
    if (dist < ball.radius * 4) {
        isDragging = true;
        dragStart = { x: pos.x, y: pos.y };
        dragEnd = { x: pos.x, y: pos.y };
    }
}

function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    dragEnd = getPointerPos(e);
}

function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) * DRAG_SCALE, MAX_POWER);

    if (power > 0.5) {
        const angle = Math.atan2(dy, dx);
        ball.vx = Math.cos(angle) * power;
        ball.vy = Math.sin(angle) * power;
        strokes++;
        strokeCountEl.textContent = strokes;
        hintEl.style.display = 'none';
    }

    dragStart = null;
    dragEnd = null;
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('mouseleave', () => { isDragging = false; dragStart = null; dragEnd = null; });
canvas.addEventListener('touchstart', onPointerDown, { passive: true });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp);

resetBtn.addEventListener('click', resetGame);

// --- Physics update ---
function update() {
    if (gameOver) return;

    if (ballSinking) {
        sinkTimer++;
        ball.radius *= 0.92;
        if (sinkTimer > 20) {
            gameOver = true;
            showWin();
        }
        return;
    }

    // Apply velocity
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    // Stop if very slow
    if (Math.abs(ball.vx) < MIN_SPEED * 0.5) ball.vx = 0;
    if (Math.abs(ball.vy) < MIN_SPEED * 0.5) ball.vy = 0;

    // Wall bouncing
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.7;
    }
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.7;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * 0.7;
    }
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy = -Math.abs(ball.vy) * 0.7;
    }

    // Hole detection
    const distToHole = distTo(ball.x, ball.y, hole.x, hole.y);
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (distToHole < hole.radius * 0.7 && speed < MAX_POWER * 0.65) {
        ballSinking = true;
        sinkTimer = 0;
        ball.vx = 0;
        ball.vy = 0;
        // Snap toward hole center
        ball.x = hole.x;
        ball.y = hole.y;
    }
}

function showWin() {
    const msgs = [
        `Nice putt, Allie! ⛳`,
        `In the hole! 🎉`,
        `Nailed it! 🏌️‍♀️`,
        `What a shot! ⭐`,
    ];
    const scoreMsg = strokes === 1 ? 'Hole in one!! 🔥' : `${strokes} strokes`;
    messageEl.textContent = msgs[Math.floor(Math.random() * msgs.length)] + ' ' + scoreMsg;
    messageEl.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
}

// --- Drawing ---
function drawGreen() {
    // Main green
    ctx.fillStyle = '#2d8a4e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grass stripes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const stripeW = canvas.width * 0.08;
    for (let x = 0; x < canvas.width; x += stripeW * 2) {
        ctx.fillRect(x, 0, stripeW, canvas.height);
    }

    // Fringe border
    const border = Math.max(4, canvas.width * 0.02);
    ctx.strokeStyle = '#1e6b3a';
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, canvas.width - border, canvas.height - border);
}

function drawHole() {
    // Shadow
    ctx.beginPath();
    ctx.arc(hole.x + 2, hole.y + 2, hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Hole
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // Inner rim
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();

    // Flag pole
    if (!ballSinking && !gameOver) {
        const poleX = hole.x + hole.radius * 0.3;
        const poleBottom = hole.y;
        const poleTop = hole.y - canvas.height * 0.09;

        ctx.beginPath();
        ctx.moveTo(poleX, poleBottom);
        ctx.lineTo(poleX, poleTop);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flag
        ctx.beginPath();
        ctx.moveTo(poleX, poleTop);
        ctx.lineTo(poleX - hole.radius * 1.5, poleTop + hole.radius * 0.8);
        ctx.lineTo(poleX, poleTop + hole.radius * 1.4);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    }
}

function drawBall() {
    if (gameOver) return;

    // Shadow
    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 3, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.25, ball.y - ball.radius * 0.25, ball.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
}

function drawAimLine() {
    if (!isDragging || !dragStart || !dragEnd) return;

    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) * DRAG_SCALE, MAX_POWER);
    const angle = Math.atan2(dy, dx);

    // Direction line from ball
    const lineLen = power * 5;
    const endX = ball.x + Math.cos(angle) * lineLen;
    const endY = ball.y + Math.sin(angle) * lineLen;

    // Dotted aim line
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Power indicator circle around ball
    const maxRadius = ball.radius * 5;
    const powerRadius = (power / MAX_POWER) * maxRadius;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, powerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = power > MAX_POWER * 0.7 ? 'rgba(239,68,68,0.5)' : 'rgba(250,204,21,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- Game loop ---
function gameLoop() {
    update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGreen();
    drawHole();
    drawBall();
    drawAimLine();

    requestAnimationFrame(gameLoop);
}

gameLoop();
