const boardElement = document.getElementById('chessboard');
const statusElement = document.getElementById('status');
const moveLog = document.getElementById('move-log');
const whiteCapturesUI = document.getElementById('captures-white');
const blackCapturesUI = document.getElementById('captures-black');
const resetBtn = document.getElementById('reset-btn');
const timerWhiteEl = document.getElementById('timer-white');
const timerBlackEl = document.getElementById('timer-black');
const modeSelect = document.getElementById('game-mode');
const difficultySelect = document.getElementById('difficulty');
//------Gestion du score------//
let scores = { white: 0, black: 0 };
const scoreWhiteEl = document.getElementById('score-white');
const scoreBlackEl = document.getElementById('score-black');

const piecesSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const pieceValues = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900,
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900
};

// Table de bonus de position (Le centre vaut 5, les bords valent 0 ou 1)
const positionWeights = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 4, 5, 5, 4, 2, 1],
    [1, 2, 4, 5, 5, 4, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0]
];

const soundMove = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-self.mp3');
const soundCapture = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/capture.mp3');
const soundCheck = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-check.mp3');
//const du timer 
const timerToggle = document.getElementById('timer-toggle');
const timerContainer = document.querySelector('.timer-container');

let board = [];
let selectedPiece = null;
let turn = 'white';
let moveCount = 1;
let timeLeft = { white: 300, black: 300 };
let timerInterval = null;
let gameStarted = false;
let gameActive = true; // Permet de savoir si la partie est en cours ou finie
// -------- VAriable pour le ROQUE --------//
let hasMoved = {
    'K': false, 'R_0_0': false, 'R_0_7': false, // Blancs (Roi et Tours)
    'k': false, 'r_7_0': false, 'r_7_7': false  // Noirs
};
function createExplosion(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    for (let i = 0; i < 10; i++) { // 10 petites particules
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // On calcule une direction aléatoire pour chaque particule
        const dx = (Math.random() - 0.5) * 150 + "px";
        const dy = (Math.random() - 0.5) * 150 + "px";
        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);

        // On lance l'animation
        particle.style.animation = `explode 0.6s ease-out forwards`;

        cell.appendChild(particle);

        // On nettoie le DOM après l'animation
        setTimeout(() => particle.remove(), 600);
    }
}

function updateScore(winner) {
    scores[winner]++;
    scoreWhiteEl.innerText = scores.white;
    scoreBlackEl.innerText = scores.black;
}

function initGame() {
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    turn = 'white';
    selectedPiece = null;
    moveCount = 1;
    timeLeft = { white: 300, black: 300 };
    gameStarted = false;
    gameActive = true; // <-- AJOUTÉ : On autorise à nouveau de marquer un point

    clearInterval(timerInterval);

    //---------Réinitialiser l'état du ROQUE----------//
    hasMoved = {
        'K': false, 'R_0_0': false, 'R_0_7': false, // Blancs
        'k': false, 'r_7_0': false, 'r_7_7': false  // Noirs
    };

    moveLog.innerHTML = '';
    whiteCapturesUI.innerHTML = '';
    blackCapturesUI.innerHTML = '';

    updateTimerDisplay();
    createBoard();
}

function createBoard() {
    boardElement.innerHTML = '';
    const gameState = checkGameOver();

    if (gameState === 'mate') {
        const winner = turn === 'white' ? 'black' : 'white';
        statusElement.innerText = `MAT ! Victoire des ${winner === 'white' ? 'Blancs' : 'Noirs'}`;
        clearInterval(timerInterval);

        if (gameActive) {
            updateScore(winner);
            gameActive = false;
        }
    } else if (isKingInCheck(turn, board)) {
        statusElement.innerText = `ÉCHEC aux ${turn === 'white' ? 'Blancs' : 'Noirs'}`;
    } else {
        statusElement.innerText = `Tour : ${turn === 'white' ? 'Blancs' : 'Noirs'}`;
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', (r + c) % 2 === 0 ? 'white' : 'black');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // --- DEBUT : AJOUT DES COORDONNEES INTERNES ---
            // On affiche le chiffre (8-r) sur la première colonne (colonne 0)
            if (c === 0) {
                const numSpan = document.createElement('span');
                numSpan.classList.add('coord-number');
                numSpan.innerText = 8 - r;
                cell.appendChild(numSpan);
            }

            // On affiche la lettre sur la dernière ligne (ligne 7)
            if (r === 7) {
                const letSpan = document.createElement('span');
                letSpan.classList.add('coord-letter');
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                letSpan.innerText = letters[c];
                cell.appendChild(letSpan);
            }
            // --- FIN : AJOUT DES COORDONNEES ---

            const piece = board[r][c];
            if (piece !== '') {
                cell.classList.add(`piece-${piece}`);
                const isWhite = piece === piece.toUpperCase();
                const isBotTurn = (turn === 'black' && modeSelect.value === 'pve');
                if (((turn === 'white' && isWhite) || (turn === 'black' && !isWhite)) && !isBotTurn) {
                    cell.setAttribute('draggable', 'true');
                }
            }

            cell.onclick = () => handleCellClick(r, c);
            cell.ondragstart = handleDragStart;
            cell.ondragover = (e) => e.preventDefault();
            cell.ondrop = handleDrop;
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    // Empêcher de cliquer pendant que le bot réfléchit
    if (turn === 'black' && modeSelect.value === 'pve') return;

    const piece = board[r][c];
    const isWhite = piece !== '' && piece === piece.toUpperCase();

    if (selectedPiece) {
        if (isValidMove(selectedPiece.r, selectedPiece.c, r, c, board) && !wouldBeInCheck(selectedPiece.r, selectedPiece.c, r, c, turn)) {

            const isCapture = board[r][c] !== ''; // On vérifie si la case d'arrivée contient une pièce

            executeMove(selectedPiece.r, selectedPiece.c, r, c);
            selectedPiece = null;

            // On attend 400ms (durée de l'animation) si c'est une capture
            setTimeout(createBoard, isCapture ? 400 : 0);

        } else {
            selectedPiece = null;
            createBoard();
        }
    } else {
        if (piece !== '' && ((turn === 'white' && isWhite) || (turn === 'black' && !isWhite))) {
            selectedPiece = { r, c };
            createBoard();
            showHints(r, c);
        }
    }
}

function showHints(fR, fC) {
    const selectedCell = document.querySelector(`[data-row="${fR}"][data-col="${fC}"]`);
    if (selectedCell) selectedCell.classList.add('selected');

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(fR, fC, r, c, board) && !wouldBeInCheck(fR, fC, r, c, turn)) {
                const targetCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (targetCell) targetCell.classList.add('possible-move');
            }
        }
    }
}

function calculateMoveScore(fR, fC, tR, tC) {
    let score = 0;
    const movingPiece = board[fR][fC];
    const targetPiece = board[tR][tC];

    // 1. Matériel : Capturer une pièce est prioritaire
    if (targetPiece !== '') {
        score += pieceValues[targetPiece] * 10;
    }

    // 2. Position : Bonus pour le contrôle du centre
    score += positionWeights[tR][tC];

    // 3. Sécurité immédiate : 
    // Même en mode Medium, on évite de donner une pièce gratuitement
    if (isSquareAttacked(tR, tC, 'white')) {
        score -= pieceValues[movingPiece] * 8;
    }

    return score;
}

function makeBotMove() {
    if (checkGameOver() !== 'playing' || turn !== 'black') return;

    let possibleMoves = [];
    const diff = difficultySelect.value;

    possibleMoves = getAllLegalMoves(board, 'black');

    if (possibleMoves.length > 0) {
        let finalMove;

        if (diff === 'hard') {
            let bestScore = -Infinity;
            let movesWithScores = [];

            for (let move of possibleMoves) {
                let tempBoard = simulateMove(board, move);
                // On a remplacé 'eval' par 'currentScore'
                let currentScore = minimax(tempBoard, 2, false, -Infinity, Infinity);

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    finalMove = move;
                }
                movesWithScores.push({ ...move, score: currentScore });
            }

            const bestMoves = movesWithScores.filter(m => m.score === bestScore);
            finalMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        } else if (diff === 'medium') {
            possibleMoves.sort((a, b) => {
                // Suppression du paramètre 'medium' ici car calculateMoveScore ne le prend plus
                return calculateMoveScore(b.fR, b.fC, b.tR, b.tC) -
                    calculateMoveScore(a.fR, a.fC, a.tR, a.tC);
            });
            finalMove = (Math.random() < 0.2) ?
                possibleMoves[Math.floor(Math.random() * Math.min(3, possibleMoves.length))] :
                possibleMoves[0];
        } else {
            finalMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        if (finalMove) {
            executeMove(finalMove.fR, finalMove.fC, finalMove.tR, finalMove.tC);
            createBoard();
        }
    }
}

function handleDragStart(e) {
    if (turn === 'black' && modeSelect.value === 'pve') {
        e.preventDefault();
        return;
    }
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    selectedPiece = { r, c };
    showHints(r, c);
    e.dataTransfer.setData('text/plain', JSON.stringify({ r, c }));
}

function handleDrop(e) {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    const data = JSON.parse(dataStr);
    let target = e.target;

    // On s'assure de pointer la cellule (cell) et non l'image à l'intérieur
    if (!target.classList.contains('cell')) target = target.closest('.cell');

    const toR = parseInt(target.dataset.row);
    const toC = parseInt(target.dataset.col);

    if (isValidMove(data.r, data.c, toR, toC, board) && !wouldBeInCheck(data.r, data.c, toR, toC, turn)) {

        // 1. On vérifie s'il y a une capture AVANT d'écraser la case
        const isCapture = board[toR][toC] !== '';

        // 2. On exécute le mouvement (qui déclenche l'animation CSS)
        executeMove(data.r, data.c, toR, toC);

        // 3. On attend la fin de l'animation avant de reconstruire le plateau
        selectedPiece = null;
        setTimeout(createBoard, isCapture ? 400 : 0);

    } else {
        selectedPiece = null;
        createBoard();
    }
}

function startTimer() {
    // ÉTAPE CLÉ : Si le timer est désactivé par l'utilisateur, on sort immédiatement
    if (!timerToggle.checked) {
        if (timerInterval) clearInterval(timerInterval);
        return;
    }

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (timeLeft[turn] > 0) {
            timeLeft[turn]--;
            updateTimerDisplay(); // Cela mettra à jour l'affichage seulement si c'est visible
        } else {
            // Fin du temps
            clearInterval(timerInterval);
            gameActive = false;
            alert("Temps écoulé ! Victoire des " + (turn === 'white' ? 'Noirs' : 'Blancs'));
        }
    }, 1000);
}

function updateTimerDisplay() {
    // Si la checkbox n'est pas cochée, on cache le conteneur des timers
    if (!timerToggle.checked) {
        timerContainer.classList.add('hidden');
        return; // On arrête là
    } else {
        timerContainer.classList.remove('hidden');
    }

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    document.getElementById('timer-white').innerText = `Blanc: ${formatTime(timeLeft.white)}`;
    document.getElementById('timer-black').innerText = `Noir: ${formatTime(timeLeft.black)}`;
}

function executeMove(fR, fC, tR, tC) {
    const movingPiece = board[fR][fC];
    const capturedPiece = board[tR][tC];
    let moveSound = soundMove;

    // 1. GESTION DES CAPTURES (Sons, UI et Animation)
    if (capturedPiece !== '') {
        const targetCell = document.querySelector(`[data-row="${tR}"][data-col="${tC}"]`);
        if (targetCell) {
            targetCell.classList.add('capture-anim');
            createExplosion(tR, tC); // <-- On lance l'explosion ici
            setTimeout(() => targetCell.classList.remove('capture-anim'), 400);
        }

        // Ajout à l'interface des pièces mangées
        const span = document.createElement('span');
        span.classList.add(`piece-${capturedPiece}`);
        (capturedPiece === capturedPiece.toUpperCase()) ?
            blackCapturesUI.appendChild(span) :
            whiteCapturesUI.appendChild(span);

        moveSound = soundCapture;
    }

    // 2. LOGIQUE SPÉCIFIQUE DU ROQUE (Déplacement automatique de la Tour)
    if (movingPiece.toLowerCase() === 'k' && Math.abs(fC - tC) === 2) {
        const isWhite = movingPiece === 'K';
        const row = isWhite ? 7 : 0;
        if (tC === 6) { // Petit roque : on déplace la tour de la colonne 7 à 5
            board[row][5] = board[row][7];
            board[row][7] = '';
        } else if (tC === 2) { // Grand roque : on déplace la tour de la colonne 0 à 3
            board[row][3] = board[row][0];
            board[row][0] = '';
        }
    }

    // 3. MISE À JOUR DES DRAPEAUX (Pour interdire le roque si on bouge)
    if (movingPiece === 'K') hasMoved.K = true;
    if (movingPiece === 'k') hasMoved.k = true;
    if (fR === 7 && fC === 0) hasMoved.R_0_0 = true;
    if (fR === 7 && fC === 7) hasMoved.R_0_7 = true;
    if (fR === 0 && fC === 0) hasMoved.r_7_0 = true;
    if (fR === 0 && fC === 7) hasMoved.r_7_7 = true;

    // 4. HISTORIQUE DES COUPS
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const logEntry = document.createElement('div');
    logEntry.className = 'move-entry';
    logEntry.innerText = `${moveCount}. ${piecesSymbols[movingPiece]} ${cols[fC]}${8 - fR}→${cols[tC]}${8 - tR}`;
    moveLog.prepend(logEntry);
    moveCount++;

    // 5. MISE À JOUR DU PLATEAU
    board[tR][tC] = movingPiece;
    board[fR][fC] = '';

    // 6. PROMOTION DU PION (Automatique en Reine)
    if (movingPiece.toLowerCase() === 'p' && (tR === 0 || tR === 7)) {
        board[tR][tC] = movingPiece === 'P' ? 'Q' : 'q';
    }

    // 7. CHANGEMENT DE TOUR
    turn = turn === 'white' ? 'black' : 'white';

    // 8. SONS ET ÉCHEC
    if (isKingInCheck(turn, board)) moveSound = soundCheck;
    moveSound.play().catch(() => { });

    // 9. RELANCE DU TIMER
    gameStarted = true; // On marque que le premier coup a été joué
    startTimer();

    // 10. TOUR DU BOT
    if (turn === 'black' && modeSelect.value === 'pve') {
        setTimeout(makeBotMove, 1500);
    }
}

// Les fonctions isValidMove, isPathClear, isKingInCheck, wouldBeInCheck, checkGameOver restent identiques
// ... (copie ton bloc de fonctions de validation ici si nécessaire, mais elles étaient correctes dans ton code)

function isValidMove(fR, fC, tR, tC, b) {
    const pieceObj = b[fR][fC];
    if (!pieceObj) return false;

    const piece = pieceObj.toLowerCase();
    const isWhite = pieceObj === pieceObj.toUpperCase();
    const target = b[tR][tC];
    const dr = tR - fR;
    const dc = tC - fC;

    // On ne peut pas manger sa propre pièce
    if (target !== '' && (target === target.toUpperCase()) === isWhite) return false;

    switch (piece) {
        case 'p': // PION
            const dir = isWhite ? -1 : 1;
            // Avancer d'une case
            if (dc === 0 && target === '' && dr === dir) return true;
            // Premier mouvement : avancer de deux cases
            if (dc === 0 && target === '' && fR === (isWhite ? 6 : 1) && dr === 2 * dir && b[fR + dir][fC] === '') return true;
            // Capturer en diagonale
            if (Math.abs(dc) === 1 && dr === dir && target !== '') return true;
            return false;

        case 'r': // TOUR
            return (fR === tR || fC === tC) && isPathClear(fR, fC, tR, tC, b);

        case 'n': // CAVALIER
            return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);

        case 'b': // FOU
            return Math.abs(dr) === Math.abs(dc) && isPathClear(fR, fC, tR, tC, b);

        case 'q': // REINE
            return (Math.abs(dr) === Math.abs(dc) || fR === tR || fC === tC) && isPathClear(fR, fC, tR, tC, b);

        case 'k': // ROI
            // Mouvement standard
            if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;

            // --- LOGIQUE DU ROQUE ---
            if (dr === 0 && Math.abs(dc) === 2) {
                // Interdit de roquer si le roi est actuellement en échec
                if (isKingInCheck(isWhite ? 'white' : 'black', b)) return false;

                if (dc === 2) { // Petit Roque (vers la droite)
                    const kingMoved = isWhite ? hasMoved.K : hasMoved.k;
                    const rookMoved = isWhite ? hasMoved.R_0_7 : hasMoved.r_7_7;
                    // Les cases entre le roi et la tour doivent être vides
                    return !kingMoved && !rookMoved && b[fR][5] === '' && b[fR][6] === '' && isPathClear(fR, fC, fR, 7, b);
                }
                if (dc === -2) { // Grand Roque (vers la gauche)
                    const kingMoved = isWhite ? hasMoved.K : hasMoved.k;
                    const rookMoved = isWhite ? hasMoved.R_0_0 : hasMoved.r_7_0;
                    // Les trois cases à gauche doivent être vides
                    return !kingMoved && !rookMoved && b[fR][1] === '' && b[fR][2] === '' && b[fR][3] === '' && isPathClear(fR, fC, fR, 0, b);
                }
            }
            return false;
    }
    return false;
}

function isPathClear(fR, fC, tR, tC, b) {
    const stepR = tR === fR ? 0 : (tR > fR ? 1 : -1);
    const stepC = tC === fC ? 0 : (tC > fC ? 1 : -1);
    let r = fR + stepR; let c = fC + stepC;
    while (r !== tR || c !== tC) {
        if (b[r][c] !== '') return false;
        r += stepR; c += stepC;
    }
    return true;
}

function isKingInCheck(color, b) {
    let kingPos = null;
    const targetKing = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] === targetKing) kingPos = { r, c };
        }
    }
    if (!kingPos) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = b[r][c];
            if (piece !== '' && (piece === piece.toUpperCase()) !== (color === 'white')) {
                if (isValidMove(r, c, kingPos.r, kingPos.c, b)) return true;
            }
        }
    }
    return false;
}

function wouldBeInCheck(fR, fC, tR, tC, color) {
    let tempBoard = board.map(row => [...row]);
    tempBoard[tR][tC] = tempBoard[fR][fC];
    tempBoard[fR][fC] = '';
    return isKingInCheck(color, tempBoard);
}

function checkGameOver() {
    let canMove = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '' && (piece === piece.toUpperCase()) === (turn === 'white')) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, board) && !wouldBeInCheck(r, c, tr, tc, turn)) {
                            canMove = true; break;
                        }
                    }
                    if (canMove) break;
                }
            }
        }
    }
    return canMove ? 'playing' : (isKingInCheck(turn, board) ? 'mate' : 'draw');
}

function evaluateBoard(currentBoard) {
    let totalScore = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece !== '') {
                const isWhite = piece === piece.toUpperCase();
                const val = pieceValues[piece];
                const posBonus = positionWeights[r][c];

                // On additionne pour les noirs (Bot), on soustrait pour les blancs (Joueur)
                if (isWhite) {
                    totalScore -= (val + posBonus);
                } else {
                    totalScore += (val + posBonus);
                }
            }
        }
    }
    return totalScore;
}

function minimax(tempBoard, depth, isMaximizing, alpha, beta) {
    // Si on a atteint la profondeur voulue ou si la partie est finie
    if (depth === 0) {
        return evaluateBoard(tempBoard);
    }

    let legals = getAllLegalMoves(tempBoard, isMaximizing ? 'black' : 'white');

    if (legals.length === 0) {
        return isKingInCheck(isMaximizing ? 'black' : 'white', tempBoard) ? (isMaximizing ? -9999 : 9999) : 0;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of legals) {
            let nextBoard = simulateMove(tempBoard, move);
            let score = minimax(nextBoard, depth - 1, false, alpha, beta);
            maxEval = Math.max(maxEval, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of legals) {
            let nextBoard = simulateMove(tempBoard, move);
            let score = minimax(nextBoard, depth - 1, true, alpha, beta);
            minEval = Math.min(minEval, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getAllLegalMoves(currentBoard, color) {
    let moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece !== '' && (color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase())) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, currentBoard) && !wouldBeInCheckCustom(r, c, tr, tc, color, currentBoard)) {
                            moves.push({ fR: r, fC: c, tR: tr, tC: tc });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function simulateMove(currentBoard, move) {
    let newBoard = currentBoard.map(row => [...row]);
    newBoard[move.tR][move.tC] = newBoard[move.fR][move.fC];
    newBoard[move.fR][move.fC] = '';
    return newBoard;
}

// Version de wouldBeInCheck qui accepte n'importe quel plateau
function wouldBeInCheckCustom(fR, fC, tR, tC, color, currentBoard) {
    let temp = simulateMove(currentBoard, { fR, fC, tR, tC });
    return isKingInCheck(color, temp);
}

// Vérifie si une case est attaquée par l'adversaire
function isSquareAttacked(targetR, targetC, byColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '' && (byColor === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase())) {
                // On utilise une version simplifiée de isValidMove pour éviter les boucles infinies
                if (isValidMove(r, c, targetR, targetC, board)) return true;
            }
        }
    }
    return false;
}
resetBtn.onclick = initGame;
// Lancer le jeu quand tout est prêt
window.onload = initGame;

// Écouteur pour activer/désactiver le timer en temps réel
timerToggle.addEventListener('change', () => {
    updateTimerDisplay();

    if (!timerToggle.checked) {
        // Si on désactive : on arrête le chrono immédiatement
        if (timerInterval) clearInterval(timerInterval);
    } else if (gameStarted && gameActive) {
        // Si on réactive alors que la partie est lancée : on relance le chrono
        startTimer();
    }
});

// Écouteur pour le changement de mode ou difficulté (Relance une partie propre)
modeSelect.addEventListener('change', initGame);
difficultySelect.addEventListener('change', initGame);