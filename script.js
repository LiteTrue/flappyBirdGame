// ===================
// Constants
// ===================
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.05;
const JUMP = -2;
const PIPE_GAP = 95;
const PIPE_WIDTH = 50;
const INITIAL_SPAWN_DELAY = 1; // frames to wait before first pipe
const PADDING_RIGHT = 50;
const PADDING_TOP = 10;

// ===================
// State Variables
// ===================
let isPaused = false;
let gameStarted = false;
let frames = 0;
let score = 0;
let gameOver = false;
let highScore = 0;

// ===================
// Canvas Setup
// ===================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// ===================
// Utility Functions
// ===================
function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

// ===================
// Asset Loading
// ===================
const images = {
    gameOver: loadImage('gameover.png'),
    pauseGUI: loadImage('pausegui.png'),
    bird: loadImage('bird.png'),
    pipeSouth: loadImage('bottompipe.png'),
    pipeNorth: loadImage('toppipe.png'),
    pauseButton: loadImage('pausebutton.png'),
    unpauseButton: loadImage('unpausebutton.png'),
    gameOverNewHighscore: loadImage('gameovernewhighscore.png'),
    clouds: [
        { img: loadImage('cloud1.png'), w: 100, h: 40 },
        { img: loadImage('cloud2.png'), w: 80, h: 45 },
        { img: loadImage('cloud3.png'), w: 110, h: 50 },
        { img: loadImage('cloud4.png'), w: 85, h: 60 }
    ]
};

// ===================
// Game Objects
// ===================

// --- Bird ---
const bird = {
    x: 50,
    y: 150,
    width: 34,
    height: 23,
    velocity: 0,
    gravity: GRAVITY,
    jump: JUMP,

    draw() {
        ctx.drawImage(images.bird, this.x, this.y, this.width, this.height);
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y + this.height >= canvas.height || this.y <= 0) {
            gameOver = true;
        }
    },
    flap() {
        this.velocity = this.jump;
    },
    resetPhysics() {
        this.gravity = GRAVITY;
        this.jump = JUMP;
    }
};

// --- Pipes ---
const pipes = [];
let lastPipeY = 200; // starting point for the first pipe

function createPipe() {
    const maxShift = 165;
    const minShift = 50;

    let minY = lastPipeY - maxShift;
    let maxY = lastPipeY + maxShift;

    minY = Math.max(50, minY);
    maxY = Math.min(canvas.height - PIPE_GAP - 50, maxY);

    let pipeHeight;
    do {
        pipeHeight = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    } while (Math.abs(pipeHeight - lastPipeY) < minShift);

    lastPipeY = pipeHeight;

    pipes.push({
        x: canvas.width,
        y: pipeHeight
    });
}

function updatePipes() {
    pipes.forEach((pipe, index) => {
        // Move pipe
        pipe.x -= 1;

        // Collision detection
        if (
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.y || bird.y + bird.height > pipe.y + PIPE_GAP)
        ) {
            gameOver = true;
        }

        // Scoring
        if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
            score++;
            pipe.passed = true;
        }

        // Remove when off screen
        if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(index, 1);
        }
    });

    // Pipe spawning rules
    if (frames > INITIAL_SPAWN_DELAY && frames % 200 === 0) {
        createPipe();
    }
}

function drawPipes() {
    pipes.forEach(pipe => {
        // Top pipe
        ctx.drawImage(images.pipeNorth, pipe.x, pipe.y - 800, PIPE_WIDTH, 800);

        // Bottom pipe sprite
        ctx.drawImage(images.pipeSouth, pipe.x, pipe.y + PIPE_GAP, PIPE_WIDTH, 800);
    });
}

// --- Clouds ---
const clouds = [];

function initClouds() {
    const minDistance = 120;
    const positions = [];

    for (let i = 0; i < 2; i++) {
        let xPos;
        let tries = 0;

        do {
            xPos = Math.random() * canvas.width;
            tries++;
        } while (positions.some(pos => Math.abs(pos - xPos) < minDistance) && tries < 100);

        positions.push(xPos);
        spawnCloud(xPos);
    }
}

function spawnCloud(xPos, yRange = [20, 180]) {
    const sprite = images.clouds[Math.floor(Math.random() * images.clouds.length)];
    const y = Math.random() * (yRange[1] - yRange[0]) + yRange[0];
    
    clouds.push({
        img: sprite.img,
        width: sprite.w,
        height: sprite.h,
        x: xPos || canvas.width,
        y: y,
        speed: Math.random() * 0.3 + 0.3
    });
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
    });

    for (let i = clouds.length - 1; i >= 0; i--) {
        if (clouds[i].x + clouds[i].width < 0) {
            clouds.splice(i, 1);
            spawnCloud();
        }
    }
}

function drawClouds() {
    clouds.forEach(cloud => {
        ctx.drawImage(cloud.img, cloud.x, cloud.y, cloud.width, cloud.height);
    });
}

// ===================
// Pause Button & GUI
// ===================
const pauseBtn = {
    x: canvas.width - PADDING_RIGHT,
    y: PADDING_TOP,
    width: 40,
    height: 40
};

function drawPauseButton() {
    ctx.clearRect(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height);

    if (gameOver) return;

    if (isPaused) {
        ctx.drawImage(images.unpauseButton, pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height);
    } else {
        ctx.drawImage(images.pauseButton, pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height);
    }
}

function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;
    if (!isPaused) {
        loop();
    } else {
        drawPauseButton();
    }
}

// ===================
// Score Drawing
// ===================
function drawScore(color = "black") {
    ctx.fillStyle = color;
    ctx.font = "24px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${score}`, 10, 10);
}

// ===================
// Main Game Loop
// ===================
function loop() {
    if (isPaused) {
        ctx.drawImage(images.pauseGUI, 0, 0, canvas.width, canvas.height);
        drawScore("white");
        drawPauseButton();
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateClouds();
    drawClouds();

    if (gameStarted) {
        bird.update();
        updatePipes();
        frames++;
    }

    drawPipes();
    bird.draw();

    drawScore();
    drawPauseButton();

    if (!gameOver) {
        requestAnimationFrame(loop);
    } else {
        // Draw Game Over box with new highscore image if needed
        const boxWidth = 300;
        const boxHeight = 180;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;

        let isNewHighScore = false;
        if (score > highScore) {
            highScore = score;
            isNewHighScore = true;
        }

        const gameOverImageToDraw = isNewHighScore ? images.gameOverNewHighscore : images.gameOver;

        ctx.drawImage(gameOverImageToDraw, boxX, boxY, boxWidth, boxHeight);

        ctx.font = "20px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(score, boxX + 82, boxY + 100);
        ctx.fillText(highScore, boxX + 206, boxY + 100);
    }
}

// ===================
// Game Reset
// ===================
function resetGame() {
    bird.y = 150;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    frames = 0;
    gameOver = false;
    lastPipeY = 200;
    bird.resetPhysics();
    gameStarted = false;
    createPipe();
}

// ===================
// Event Listeners
// ===================
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Retry on Game Over
    if (gameOver) {
        resetGame();
        loop();
        return;
    }

    // Pause toggle or flap
    if (
        mouseX >= pauseBtn.x &&
        mouseX <= pauseBtn.x + pauseBtn.width &&
        mouseY >= pauseBtn.y &&
        mouseY <= pauseBtn.y + pauseBtn.height
    ) {
        togglePause();
    } else if (!isPaused) {
        gameStarted = true;
        bird.flap();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    if (e.code === "Space") {
        e.preventDefault();

        if (gameOver) {
            resetGame();
            loop();
            return;
        }

        if (!isPaused) {
            gameStarted = true;
            bird.flap();
        }
    } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        togglePause();
    }
});

// ===================
// Start
// ===================
initClouds();
createPipe();
loop();