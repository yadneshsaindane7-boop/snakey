// Game Configuration
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

// Game State
let canvas, ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0, type: 'regular' };
let score = 0;
let highScore = 0;
let level = 1;
let speed = 100;
let gameLoop = null;
let gameRunning = false;
let particles = [];

// Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Food Types
const FOOD_TYPES = {
    regular: { points: 10, color: '#ff006e', emoji: '🍎' },
    golden: { points: 50, color: '#ffcb00', emoji: '⭐' }
};

// Initialize Game
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    loadHighScore();
    updateHighScoreDisplay();
    setupEventListeners();
});

// Load High Score from localStorage
function loadHighScore() {
    const saved = localStorage.getItem('snakeHighScore');
    highScore = saved ? parseInt(saved) : 0;
}

// Save High Score to localStorage
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('newHighScore').classList.add('show');
    }
}

// Update High Score Display
function updateHighScoreDisplay() {
    document.getElementById('highScoreStart').textContent = highScore;
    document.getElementById('highScore').textContent = highScore;
}

// Setup Event Listeners
function setupEventListeners() {
    // Keyboard Controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Prevent arrow key scrolling
    window.addEventListener('keydown', (e) => {
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    });
}

// Handle Keyboard Input
function handleKeyPress(e) {
    const key = e.key.toLowerCase();
    
    // Start/Restart with Space
    if (e.code === 'Space') {
        if (document.getElementById('startScreen').classList.contains('active')) {
            startGame();
        } else if (document.getElementById('gameOverScreen').classList.contains('active')) {
            restartGame();
        }
        return;
    }
    
    if (!gameRunning) return;
    
    // Direction controls
    if ((key === 'arrowup' || key === 'w') && direction.y !== 1) {
        nextDirection = { x: 0, y: -1 };
    } else if ((key === 'arrowdown' || key === 's') && direction.y !== -1) {
        nextDirection = { x: 0, y: 1 };
    } else if ((key === 'arrowleft' || key === 'a') && direction.x !== 1) {
        nextDirection = { x: -1, y: 0 };
    } else if ((key === 'arrowright' || key === 'd') && direction.x !== -1) {
        nextDirection = { x: 1, y: 0 };
    }
}

// Change Direction (for mobile controls)
function changeDirection(dir) {
    if (!gameRunning) return;
    
    if (dir === 'up' && direction.y !== 1) {
        nextDirection = { x: 0, y: -1 };
    } else if (dir === 'down' && direction.y !== -1) {
        nextDirection = { x: 0, y: 1 };
    } else if (dir === 'left' && direction.x !== 1) {
        nextDirection = { x: -1, y: 0 };
    } else if (dir === 'right' && direction.x !== -1) {
        nextDirection = { x: 1, y: 0 };
    }
}

// Start Game
function startGame() {
    // Hide start screen, show game screen
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    
    // Initialize game state
    initializeGame();
    
    // Start game loop
    gameRunning = true;
    gameLoop = setInterval(update, speed);
}

// Initialize Game State
function initializeGame() {
    // Reset snake
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    level = 1;
    speed = 150;
    particles = [];
    
    updateScore();
    placeFood();
    render();
}

// Place Food
function placeFood() {
    let validPosition = false;
    let newFood;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Check if position is not on snake
        validPosition = !snake.some(segment => 
            segment.x === newFood.x && segment.y === newFood.y
        );
    }
    
    // 10% chance for golden food
    const isGolden = Math.random() < 0.1;
    food = {
        ...newFood,
        type: isGolden ? 'golden' : 'regular'
    };
}

// Update Game State
function update() {
    // Update direction
    direction = { ...nextDirection };
    
    // Calculate new head position
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || 
        head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        eatFood();
    } else {
        // Remove tail (snake doesn't grow)
        snake.pop();
    }
    
    // Update particles
    updateParticles();
    
    // Render
    render();
}

// Eat Food
function eatFood() {
    const foodType = FOOD_TYPES[food.type];
    score += foodType.points;
    updateScore();
    
    // Create particle effect
    createParticles(food.x * CELL_SIZE + CELL_SIZE / 2, 
                   food.y * CELL_SIZE + CELL_SIZE / 2, 
                   foodType.color);
    
    // Play sound
    playSound(440, 0.1);
    
    // Check for level up
    if (score % 50 === 0 && score > 0) {
        levelUp();
    }
    
    // Place new food
    placeFood();
}

// Level Up
function levelUp() {
    level++;
    document.getElementById('level').textContent = level;
    
    // Increase speed
    if (speed > 70) {
        speed -= 10;
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    }
    
    // Play level up sound
    playSound(880, 0.2);
    
    // Visual effect
    canvas.style.boxShadow = '0 0 50px rgba(255, 203, 0, 0.8)';
    setTimeout(() => {
        canvas.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.5)';
    }, 300);
}

// Update Score Display
function updateScore() {
    document.getElementById('score').textContent = score;
}

// Create Particles
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color: color
        });
    }
}

// Update Particles
function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
    });
}

// Render Game
function render() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#2e2e4a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw food
    const foodType = FOOD_TYPES[food.type];
    ctx.fillStyle = foodType.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = foodType.color;
    
    // Pulsing effect
    const pulse = Math.sin(Date.now() / 200) * 2 + CELL_SIZE - 4;
    ctx.fillRect(
        food.x * CELL_SIZE + (CELL_SIZE - pulse) / 2,
        food.y * CELL_SIZE + (CELL_SIZE - pulse) / 2,
        pulse,
        pulse
    );
    
    ctx.shadowBlur = 0;
    
    // Draw snake
    snake.forEach((segment, index) => {
        const brightness = 1 - (index / snake.length) * 0.4;
        
        if (index === 0) {
            // Head
            ctx.fillStyle = '#00ff41';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff41';
        } else {
            // Body
            ctx.fillStyle = `hsl(120, 100%, ${brightness * 40}%)`;
            ctx.shadowBlur = 5;
            ctx.shadowColor = `hsl(120, 100%, ${brightness * 40}%)`;
        }
        
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });
    
    ctx.shadowBlur = 0;
    
    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// Game Over
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    // Play game over sound
    playSound(220, 0.5);
    
    // Save high score
    saveHighScore();
    
    // Update game over screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHighScore').textContent = highScore;
    document.getElementById('snakeLength').textContent = snake.length;
    
    // Show game over screen
    setTimeout(() => {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('gameOverScreen').classList.add('active');
    }, 500);
}

// Restart Game
function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('newHighScore').classList.remove('show');
    startGame();
}

// Play Sound
function playSound(frequency, duration) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + duration
        );
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Audio not supported or blocked
        console.log('Audio not available');
    }
}


