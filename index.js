// =========================================
// VARIABLES GLOBALES ET CONSTANTES
// =========================================

// Éléments DOM pour l'interface utilisateur
const boardElement = document.getElementById('chessboard'); // Conteneur du plateau d'échecs
const statusElement = document.getElementById('status'); // Affichage du statut du jeu (tour, échec, etc.)
const moveLog = document.getElementById('move-log'); // Journal des coups joués
const whiteCapturesUI = document.getElementById('captures-white'); // Affichage des pièces capturées par les Blancs
const blackCapturesUI = document.getElementById('captures-black'); // Affichage des pièces capturées par les Noirs
const resetBtn = document.getElementById('reset-btn'); // Bouton pour recommencer la partie
const timerWhiteEl = document.getElementById('timer-white'); // Affichage du timer pour les Blancs
const timerBlackEl = document.getElementById('timer-black'); // Affichage du timer pour les Noirs
const modeSelect = document.getElementById('game-mode'); // Sélecteur de mode (PvP ou PvE)
const difficultySelect = document.getElementById('difficulty'); // Sélecteur de difficulté pour le bot

// Gestion du score des parties
let scores = { white: 0, black: 0 }; // Compteurs de victoires
const scoreWhiteEl = document.getElementById('score-white'); // Affichage du score des Blancs
const scoreBlackEl = document.getElementById('score-black'); // Affichage du score des Noirs

// Symboles Unicode pour représenter les pièces d'échecs
const piecesSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟', // Pièces noires
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'  // Pièces blanches
};

// Valeurs des pièces pour l'évaluation de l'IA (en centipions)
const pieceValues = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900, // Pièces noires
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900  // Pièces blanches
};

// Table de bonus de position pour l'évaluation (le centre du plateau vaut plus)
const positionWeights = [
    [0, 0, 0, 0, 0, 0, 0, 0], // Rangée 8 (dernière pour les Blancs)
    [1, 1, 1, 1, 1, 1, 1, 1], // Rangée 7
    [1, 2, 2, 2, 2, 2, 2, 1], // Rangée 6
    [1, 2, 4, 5, 5, 4, 2, 1], // Rangée 5 (centre)
    [1, 2, 4, 5, 5, 4, 2, 1], // Rangée 4 (centre)
    [1, 2, 2, 2, 2, 2, 2, 1], // Rangée 3
    [1, 1, 1, 1, 1, 1, 1, 1], // Rangée 2
    [0, 0, 0, 0, 0, 0, 0, 0]  // Rangée 1 (dernière pour les Noirs)
];

// Sons pour les actions du jeu
const soundMove = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-self.mp3'); // Son de déplacement
const soundCapture = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/capture.mp3'); // Son de capture
const soundCheck = new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-check.mp3'); // Son d'échec

// Éléments pour le timer
const timerToggle = document.getElementById('timer-toggle'); // Checkbox pour activer/désactiver le timer
const timerContainer = document.querySelector('.timer-container'); // Conteneur des timers

// État du jeu
let board = []; // Représentation du plateau (8x8 array de strings)
let selectedPiece = null; // Pièce actuellement sélectionnée {r, c}
let turn = 'white'; // Tour actuel ('white' ou 'black')
let moveCount = 1; // Numéro du coup actuel
let timeLeft = { white: 300, black: 300 }; // Temps restant en secondes (5 minutes chacun)
let timerInterval = null; // Intervalle pour le timer
let gameStarted = false; // Indique si la partie a commencé
let gameActive = true; // Indique si la partie est active (pas terminée)

// Variables pour gérer le roque (castling)
let hasMoved = {
    'K': false, 'R_0_0': false, 'R_0_7': false, // Blancs : Roi et Tours (indices 0,0 et 0,7)
    'k': false, 'r_7_0': false, 'r_7_7': false  // Noirs : Roi et Tours (indices 7,0 et 7,7)
};
// =========================================
// FONCTIONS UTILITAIRES ET D'INITIALISATION
// =========================================

// Crée un effet d'explosion visuelle lors d'une capture de pièce
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

// Met à jour le score des joueurs après une victoire
function updateScore(winner) {
    scores[winner]++;
    scoreWhiteEl.innerText = scores.white;
    scoreBlackEl.innerText = scores.black;
}

// Initialise une nouvelle partie d'échecs
function initGame() {
    // Configuration initiale du plateau (position standard des pièces)
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], // Rangée 8 (Noirs)
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], // Rangée 7 (Pions noirs)
        ['', '', '', '', '', '', '', ''],         // Rangée 6 (vide)
        ['', '', '', '', '', '', '', ''],         // Rangée 5 (vide)
        ['', '', '', '', '', '', '', ''],         // Rangée 4 (vide)
        ['', '', '', '', '', '', '', ''],         // Rangée 3 (vide)
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], // Rangée 2 (Pions blancs)
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']  // Rangée 1 (Blancs)
    ];

    // Réinitialisation des variables d'état du jeu
    turn = 'white'; // Les Blancs commencent
    selectedPiece = null; // Aucune pièce sélectionnée
    moveCount = 1; // Premier coup
    timeLeft = { white: 300, black: 300 }; // 5 minutes chacun (300 secondes)
    gameStarted = false; // La partie n'a pas encore commencé
    gameActive = true; // La partie est active

    clearInterval(timerInterval); // Arrêt du timer précédent

    // Réinitialisation des drapeaux de roque (aucune pièce n'a bougé)
    hasMoved = {
        'K': false, 'R_0_0': false, 'R_0_7': false, // Blancs : Roi et Tours
        'k': false, 'r_7_0': false, 'r_7_7': false  // Noirs : Roi et Tours
    };

    // Nettoyage de l'interface utilisateur
    moveLog.innerHTML = ''; // Vide l'historique des coups
    whiteCapturesUI.innerHTML = ''; // Vide les pièces capturées par les Blancs
    blackCapturesUI.innerHTML = ''; // Vide les pièces capturées par les Noirs

    updateTimerDisplay(); // Met à jour l'affichage des timers
    createBoard(); // Crée et affiche le plateau
}

// =========================================
// FONCTIONS D'AFFICHAGE ET D'INTERACTION
// =========================================

// Crée et affiche le plateau d'échecs avec toutes les pièces et informations de jeu
function createBoard() {
    boardElement.innerHTML = ''; // Vide le conteneur du plateau
    const gameState = checkGameOver(); // Vérifie si la partie est terminée

    // Mise à jour du statut du jeu selon l'état actuel
    if (gameState === 'mate') {
        const winner = turn === 'white' ? 'black' : 'white'; // Le gagnant est l'adversaire du joueur en échec
        statusElement.innerText = `MAT ! Victoire des ${winner === 'white' ? 'Blancs' : 'Noirs'}`;
        clearInterval(timerInterval); // Arrêt du timer

        if (gameActive) {
            updateScore(winner); // Met à jour le score
            gameActive = false; // Marque la partie comme terminée
        }
    } else if (isKingInCheck(turn, board)) {
        statusElement.innerText = `ÉCHEC aux ${turn === 'white' ? 'Blancs' : 'Noirs'}`;
    } else {
        statusElement.innerText = `Tour : ${turn === 'white' ? 'Blancs' : 'Noirs'}`;
    }

    // Création des 64 cases du plateau
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', (r + c) % 2 === 0 ? 'white' : 'black'); // Alternance couleur cases
            cell.dataset.row = r; // Stockage des coordonnées pour les interactions
            cell.dataset.col = c;

            // Ajout des coordonnées alphanumériques sur le plateau
            // Chiffres sur la colonne de gauche (8-r pour commencer par 8 en haut)
            if (c === 0) {
                const numSpan = document.createElement('span');
                numSpan.classList.add('coord-number');
                numSpan.innerText = 8 - r;
                cell.appendChild(numSpan);
            }

            // Lettres sur la ligne du bas (a-h)
            if (r === 7) {
                const letSpan = document.createElement('span');
                letSpan.classList.add('coord-letter');
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                letSpan.innerText = letters[c];
                cell.appendChild(letSpan);
            }

            const piece = board[r][c];
            if (piece !== '') {
                cell.classList.add(`piece-${piece}`); // Ajout de la classe CSS pour afficher la pièce
                const isWhite = piece === piece.toUpperCase();
                const isBotTurn = (turn === 'black' && modeSelect.value === 'pve');
                // Rend la pièce déplaçable si c'est le tour du joueur et pas du bot
                if (((turn === 'white' && isWhite) || (turn === 'black' && !isWhite)) && !isBotTurn) {
                    cell.setAttribute('draggable', 'true');
                }
            }

            // Ajout des gestionnaires d'événements pour les interactions
            cell.onclick = () => handleCellClick(r, c);
            cell.ondragstart = handleDragStart;
            cell.ondragover = (e) => e.preventDefault();
            cell.ondrop = handleDrop;
            boardElement.appendChild(cell);
        }
    }
}

// Gère les clics sur les cases du plateau pour sélectionner et déplacer les pièces
function handleCellClick(r, c) {
    // Empêcher de cliquer pendant que le bot réfléchit
    if (turn === 'black' && modeSelect.value === 'pve') return;

    const piece = board[r][c];
    const isWhite = piece !== '' && piece === piece.toUpperCase();

    if (selectedPiece) {
        // Si une pièce est déjà sélectionnée, tenter de la déplacer
        if (isValidMove(selectedPiece.r, selectedPiece.c, r, c, board) && !wouldBeInCheck(selectedPiece.r, selectedPiece.c, r, c, turn)) {

            const isCapture = board[r][c] !== ''; // Vérifie si la case d'arrivée contient une pièce

            executeMove(selectedPiece.r, selectedPiece.c, r, c); // Exécute le mouvement
            selectedPiece = null; // Désélectionne la pièce

            // Attend la fin de l'animation avant de reconstruire le plateau
            setTimeout(createBoard, isCapture ? 400 : 0);

        } else {
            // Mouvement invalide : désélectionne et rafraîchit le plateau
            selectedPiece = null;
            createBoard();
        }
    } else {
        // Sélectionne une pièce si elle appartient au joueur actuel
        if (piece !== '' && ((turn === 'white' && isWhite) || (turn === 'black' && !isWhite))) {
            selectedPiece = { r, c };
            createBoard(); // Rafraîchit pour montrer la sélection
            showHints(r, c); // Affiche les mouvements possibles
        }
    }
}

// Affiche les mouvements possibles pour la pièce sélectionnée en surlignant les cases
function showHints(fR, fC) {
    // Surligne la case de la pièce sélectionnée
    const selectedCell = document.querySelector(`[data-row="${fR}"][data-col="${fC}"]`);
    if (selectedCell) selectedCell.classList.add('selected');

    // Parcourt toutes les cases pour identifier les mouvements valides
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Vérifie si le mouvement est valide et ne met pas le roi en échec
            if (isValidMove(fR, fC, r, c, board) && !wouldBeInCheck(fR, fC, r, c, turn)) {
                const targetCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (targetCell) targetCell.classList.add('possible-move'); // Surligne la case cible
            }
        }
    }
}

// Calcule un score heuristique pour un mouvement donné, utilisé par l'IA en mode Medium
function calculateMoveScore(fR, fC, tR, tC) {
    let score = 0;
    const movingPiece = board[fR][fC];
    const targetPiece = board[tR][tC];

    // 1. Matériel : Capturer une pièce est prioritaire
    if (targetPiece !== '') {
        score += pieceValues[targetPiece] * 10; // Bonus élevé pour les captures
    }

    // 2. Position : Bonus pour le contrôle du centre
    score += positionWeights[tR][tC]; // Points supplémentaires pour les cases centrales

    // 3. Sécurité immédiate : Évite de placer la pièce sur une case attaquée
    // Même en mode Medium, on évite de donner une pièce gratuitement
    if (isSquareAttacked(tR, tC, 'white')) {
        score -= pieceValues[movingPiece] * 8; // Pénalité si la case est attaquée par l'adversaire
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

// Gère le début du drag-and-drop pour déplacer une pièce
function handleDragStart(e) {
    // Empêche le drag si c'est le tour du bot
    if (turn === 'black' && modeSelect.value === 'pve') {
        e.preventDefault();
        return;
    }
    // Récupère les coordonnées de la pièce sélectionnée
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    selectedPiece = { r, c };
    showHints(r, c); // Affiche les mouvements possibles
    // Stocke les données pour le drop
    e.dataTransfer.setData('text/plain', JSON.stringify({ r, c }));
}

// Gère la fin du drag-and-drop pour valider et exécuter le mouvement de pièce
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

// Démarre ou relance le timer pour le joueur actuel, gérant la fin de partie si le temps est écoulé
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

// Met à jour l'affichage des timers en fonction de l'état du toggle et formate le temps restant
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

// Vérifie si un mouvement est valide selon les règles des pièces d'échecs, incluant le roque
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

// Vérifie si le chemin entre deux cases est dégagé pour les pièces qui se déplacent en ligne droite (Tour, Fou, Reine)
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

// Vérifie si le roi de la couleur donnée est en échec sur le plateau fourni
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

// Vérifie si la partie est terminée : retourne 'playing', 'mate' ou 'draw'
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

// Évalue le plateau actuel et retourne un score pour l'IA (positif favorable aux noirs, négatif aux blancs)
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

// Retourne tous les mouvements légaux pour une couleur donnée sur un plateau donné
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