// WEB AUDIO API SYNTHETIC SOUND EFFECTS
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let isSoundMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (isSoundMuted) return;
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'x') {
        // High punch tone for X
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    } else if (type === 'o') {
        // Warm lower tone for O
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
        // Victory Fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const oscW = audioCtx.createOscillator();
            const gainW = audioCtx.createGain();
            oscW.type = 'triangle';
            oscW.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
            gainW.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.08);
            gainW.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.2);
            oscW.connect(gainW);
            gainW.connect(audioCtx.destination);
            oscW.start(audioCtx.currentTime + idx * 0.08);
            oscW.stop(audioCtx.currentTime + idx * 0.08 + 0.2);
        });
        return;
    } else if (type === 'draw') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function toggleSound() {
    isSoundMuted = !isSoundMuted;
    const icon = document.getElementById('sound-icon');
    icon.className = isSoundMuted ? 'fa-solid fa-volume-xmark text-red-400' : 'fa-solid fa-volume-high text-slate-300';
}

// GAME STATE VARIABLES
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let isGameActive = true;
let gameMode = 'pvp'; // 'pvp' or 'ai'
let aiDifficulty = 'hard'; // 'easy', 'medium', 'hard'

let scores = JSON.parse(localStorage.getItem('ttt_scores') || '{"x": 0, "o": 0, "ties": 0}');

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// DOM ELEMENTS
const cellButtons = document.querySelectorAll('.cell-btn');
const statusText = document.getElementById('status-text');
const turnIcon = document.getElementById('turn-icon');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreTiesEl = document.getElementById('score-ties');
const labelO = document.getElementById('label-o');
const aiDiffContainer = document.getElementById('ai-difficulty-container');
const diffLabel = document.getElementById('diff-label');

// INITIALIZE APP
window.onload = () => {
    updateScoreboard();
    restartMatch();
};

// SET GAME MODE (PvP vs AI)
function setMode(mode) {
    gameMode = mode;
    const pvpBtn = document.getElementById('mode-pvp-btn');
    const aiBtn = document.getElementById('mode-ai-btn');

    if (mode === 'pvp') {
        pvpBtn.className = 'py-2.5 rounded-xl transition duration-200 bg-indigo-600 text-white shadow-md';
        aiBtn.className = 'py-2.5 rounded-xl transition duration-200 text-slate-400 hover:text-white';
        aiDiffContainer.classList.add('hidden');
        aiDiffContainer.classList.remove('flex');
        labelO.innerText = 'PLAYER O';
    } else {
        aiBtn.className = 'py-2.5 rounded-xl transition duration-200 bg-indigo-600 text-white shadow-md';
        pvpBtn.className = 'py-2.5 rounded-xl transition duration-200 text-slate-400 hover:text-white';
        aiDiffContainer.classList.remove('hidden');
        aiDiffContainer.classList.add('flex');
        labelO.innerText = 'AI (O)';
    }
    restartMatch();
}

// SET AI DIFFICULTY LEVEL
function setDifficulty(diff) {
    aiDifficulty = diff;
    const btnEasy = document.getElementById('diff-easy');
    const btnMedium = document.getElementById('diff-medium');
    const btnHard = document.getElementById('diff-hard');

    [btnEasy, btnMedium, btnHard].forEach(btn => {
        btn.className = 'py-1.5 rounded-lg text-slate-400 transition';
    });

    if (diff === 'easy') {
        btnEasy.className = 'py-1.5 rounded-lg bg-indigo-600/80 text-white font-bold transition shadow-sm';
        diffLabel.innerText = 'Easy';
        diffLabel.className = 'text-green-400 font-bold';
    } else if (diff === 'medium') {
        btnMedium.className = 'py-1.5 rounded-lg bg-indigo-600/80 text-white font-bold transition shadow-sm';
        diffLabel.innerText = 'Medium';
        diffLabel.className = 'text-amber-400 font-bold';
    } else {
        btnHard.className = 'py-1.5 rounded-lg bg-indigo-600/80 text-white font-bold transition shadow-sm';
        diffLabel.innerText = 'Unbeatable';
        diffLabel.className = 'text-indigo-400 font-bold';
    }
    restartMatch();
}

// CELL CLICK HANDLER
function handleCellClick(index) {
    if (board[index] !== '' || !isGameActive) return;

    makeMove(index, currentPlayer);

    if (isGameActive && gameMode === 'ai' && currentPlayer === 'O') {
        // Disable clicking while AI moves
        isGameActive = false;
        setTimeout(() => {
            makeAIMove();
            isGameActive = true;
        }, 400);
    }
}

// MAKE A MOVE ON BOARD
function makeMove(index, player) {
    board[index] = player;
    const cell = cellButtons[index];

    if (player === 'X') {
        cell.innerText = '✕';
        cell.className = 'cell-btn bg-slate-800 rounded-2xl flex items-center justify-center text-4xl font-black text-pink-500 border border-pink-500/40 shadow-lg shadow-pink-500/10';
        playSound('x');
    } else {
        cell.innerText = '◯';
        cell.className = 'cell-btn bg-slate-800 rounded-2xl flex items-center justify-center text-4xl font-black text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10';
        playSound('o');
    }

    checkResult();
}

// CHECK WIN OR TIE CONDITION
function checkResult() {
    let roundWon = false;
    let winningCombo = null;

    for (let combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCombo = combo;
            break;
        }
    }

    if (roundWon) {
        isGameActive = false;
        playSound('win');
        
        // Highlight winning cells
        winningCombo.forEach(idx => {
            cellButtons[idx].classList.add('winning-cell', 'border-2', 'border-yellow-400');
        });

        statusText.innerText = `Player ${currentPlayer} Wins!`;
        turnIcon.innerText = currentPlayer === 'X' ? '✕' : '◯';
        turnIcon.className = currentPlayer === 'X' ? 'text-pink-400 font-black text-base' : 'text-blue-400 font-black text-base';

        if (currentPlayer === 'X') scores.x++;
        else scores.o++;

        saveScores();
        return;
    }

    // Check for Tie
    if (!board.includes('')) {
        isGameActive = false;
        playSound('draw');
        statusText.innerText = `It's a Tie!`;
        turnIcon.innerText = '🤝';
        turnIcon.className = 'text-base';
        scores.ties++;
        saveScores();
        return;
    }

    // Switch Player Turn
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatusBanner();
}

function updateStatusBanner() {
    turnIcon.innerText = currentPlayer === 'X' ? '✕' : '◯';
    turnIcon.className = currentPlayer === 'X' ? 'text-pink-400 font-extrabold text-base' : 'text-blue-400 font-extrabold text-base';

    if (gameMode === 'ai' && currentPlayer === 'O') {
        statusText.innerText = "AI is thinking...";
    } else {
        statusText.innerText = `Player ${currentPlayer}'s Turn`;
    }
}

// AI LOGIC ENGINE
function makeAIMove() {
    let bestMove;

    if (aiDifficulty === 'easy') {
        bestMove = getRandomMove();
    } else if (aiDifficulty === 'medium') {
        // 50% chance optimal, 50% random
        bestMove = Math.random() < 0.5 ? getBestMoveMinimax() : getRandomMove();
    } else {
        // Unbeatable Minimax Algorithm
        bestMove = getBestMoveMinimax();
    }

    if (bestMove !== undefined && bestMove !== null) {
        makeMove(bestMove, 'O');
    }
}

function getRandomMove() {
    const available = [];
    board.forEach((val, i) => { if (val === '') available.push(i); });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

// MINIMAX ALGORITHM FOR HARD UNBEATABLE AI
function getBestMoveMinimax() {
    let bestScore = -Infinity;
    let move = null;

    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(tempBoard, depth, isMaximizing) {
    let result = checkWinnerMinimax(tempBoard);
    if (result !== null) {
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (result === 'tie') return 0;
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (tempBoard[i] === '') {
                tempBoard[i] = 'O';
                let score = minimax(tempBoard, depth + 1, false);
                tempBoard[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (tempBoard[i] === '') {
                tempBoard[i] = 'X';
                let score = minimax(tempBoard, depth + 1, true);
                tempBoard[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkWinnerMinimax(tempBoard) {
    for (let combo of winningCombinations) {
        const [a, b, c] = combo;
        if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
            return tempBoard[a];
        }
    }
    if (!tempBoard.includes('')) return 'tie';
    return null;
}

// SCOREBOARD & LOCAL STORAGE
function updateScoreboard() {
    scoreXEl.innerText = scores.x;
    scoreOEl.innerText = scores.o;
    scoreTiesEl.innerText = scores.ties;
}

function saveScores() {
    updateScoreboard();
    localStorage.setItem('ttt_scores', JSON.stringify(scores));
}

function resetScores() {
    scores = { x: 0, o: 0, ties: 0 };
    saveScores();
}

// RESTART MATCH ROUND
function restartMatch() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    isGameActive = true;

    cellButtons.forEach(cell => {
        cell.innerText = '';
        cell.className = 'cell-btn bg-slate-800/90 hover:bg-slate-750 rounded-2xl flex items-center justify-center text-4xl font-black text-slate-700 cursor-pointer border border-slate-700/50';
    });

    updateStatusBanner();
}
