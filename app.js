const canvas = document.getElementById('chessBoard');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 8;
const SQUARE_SIZE = canvas.width / BOARD_SIZE;

const pieces = {
    'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟',
    'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'
};

let board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let selectedPiece = null;
let validMoves = [];

let currentPlayer = 'white';

let lastThoughts = [];

let moveHistory = [];

let freeModeEnabled = false;

let moveStack = [];
let redoStack = [];

let DEPTH = 3;

function isValidMove(from, to) {
    const piece = board[from.row][from.col];
    const targetPiece = board[to.row][to.col];
    const dx = to.col - from.col;
    const dy = to.row - from.row;

    // Check if the target square is occupied by a piece of the same color
    if (targetPiece !== ' ' && 
        (piece === piece.toUpperCase()) === (targetPiece === targetPiece.toUpperCase())) {
        return false;
    }

    switch (piece.toLowerCase()) {
        case 'p':
            // Pawn logic
            const direction = piece === 'P' ? -1 : 1;
            if (dx === 0 && dy === direction && targetPiece === ' ') return true;
            if (dx === 0 && dy === 2 * direction && targetPiece === ' ' && board[from.row + direction][from.col] === ' ' && 
                ((piece === 'P' && from.row === 6) || (piece === 'p' && from.row === 1))) return true;
            if (Math.abs(dx) === 1 && dy === direction && targetPiece !== ' ') return true;
            return false;
        case 'r':
            // Rook logic
            return (dx === 0 || dy === 0) && isPathClear(from, to);
        case 'n':
            // Knight logic
            return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
        case 'b':
            // Bishop logic
            return Math.abs(dx) === Math.abs(dy) && isPathClear(from, to);
        case 'q':
            // Queen logic
            return ((dx === 0 || dy === 0) || (Math.abs(dx) === Math.abs(dy))) && isPathClear(from, to);
        case 'k':
            // King logic
            return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    }
}

function isPathClear(from, to) {
    const dx = Math.sign(to.col - from.col);
    const dy = Math.sign(to.row - from.row);
    let x = from.col + dx;
    let y = from.row + dy;

    while (x !== to.col || y !== to.row) {
        if (board[y][x] !== ' ') return false;
        x += dx;
        y += dy;
    }
    return true;
}

function getValidMoves(piece) {
    const moves = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (isValidMove(piece, {row, col})) {
                moves.push({row, col});
            }
        }
    }
    return moves;
}

function drawBoard() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

            if (board[row][col] !== ' ') {
                ctx.fillStyle = board[row][col] === board[row][col].toUpperCase() ? 'white' : 'black';
                ctx.font = `${SQUARE_SIZE * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pieces[board[row][col]], (col + 0.5) * SQUARE_SIZE, (row + 0.5) * SQUARE_SIZE);
            }
        }
    }

    // Highlight selected piece
    if (selectedPiece) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(selectedPiece.col * SQUARE_SIZE, selectedPiece.row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
    }

    // Highlight valid moves
    for (const move of validMoves) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(move.col * SQUARE_SIZE, move.row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
    }

    // Draw cell numbers
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cellName = String.fromCharCode(97 + col) + (8 - row);
            ctx.fillText(cellName, col * SQUARE_SIZE + 2, row * SQUARE_SIZE + 2);
        }
    }

    // Draw the last thoughts after drawing the board
    displayThoughts(lastThoughts);

    if (window.moveAnalysisEnabled) {
        showBestMove();
    }
}

function getClickedSquare(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
        row: Math.floor(y / SQUARE_SIZE),
        col: Math.floor(x / SQUARE_SIZE)
    };
}

let autoMoveEnabled = false;

function robotMove() {
    if (window.chessBot && currentPlayer === 'black') {
        const move = window.chessBot.getBestMoveForBlack(3); // New method for black moves
        if (move) {
            makeMove(move.from, move.to);
            updateUndoRedoButtonStates();
        }
    }
}

function makeAutoMove() {
    if (autoMoveEnabled && currentPlayer === 'white') {
        const bestMove = window.chessBot.getBestMove(3);
        if (bestMove) {
            makeMove(bestMove.from, bestMove.to);
        }
    }
}

function makeMove(from, to) {
    const piece = board[from.row][from.col];
    const capturedPiece = board[to.row][to.col];
    
    // Save the move for undo
    moveStack.push({
        from: from,
        to: to,
        piece: piece,
        capturedPiece: capturedPiece,
        currentPlayer: currentPlayer
    });
    
    // Clear redo stack when a new move is made
    redoStack = [];

    board[to.row][to.col] = board[from.row][from.col];
    board[from.row][from.col] = ' ';
    
    // Update the bot's board
    if (window.chessBot) {
        window.chessBot.board = board;
    }

    // Clear last thoughts when a new move is made
    lastThoughts = [];

    // Record move in history
    const fromCell = String.fromCharCode(97 + from.col) + (8 - from.row);
    const toCell = String.fromCharCode(97 + to.col) + (8 - to.row);
    const moveNotation = `${piece}${fromCell}-${toCell}${capturedPiece !== ' ' ? 'x' + capturedPiece : ''}`;
    
    if (currentPlayer === 'white') {
        moveHistory.push([moveNotation, '']);
    } else {
        moveHistory[moveHistory.length - 1][1] = moveNotation;
    }
    updateMoveHistoryTable();

    // Switch players only if not in Free Mode
    if (!freeModeEnabled) {
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    }
    
    drawBoard();
    
    // Robot's turn if it's black's turn and not in Free Mode
    if (!freeModeEnabled && currentPlayer === 'black') {
        setTimeout(robotMove, 500);
    } else if (autoMoveEnabled && currentPlayer === 'white') {
        setTimeout(makeAutoMove, 500);
    }

    updateBestMoveButtonState();
    updateUndoRedoButtonStates();
}

function getRandomEmptySquare() {
    const emptySquares = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === ' ') {
                emptySquares.push({ row, col });
            }
        }
    }
    
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
}

function clearBestMoveHighlight() {
    drawBoard();
}

function highlightBestMove(move) {
    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.fillRect(move.from.col * SQUARE_SIZE, move.from.row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
    ctx.fillRect(move.to.col * SQUARE_SIZE, move.to.row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
}

function toggleAutoMove() {
    autoMoveEnabled = !autoMoveEnabled;
    if (autoMoveEnabled) {
        freeModeEnabled = false;
        document.getElementById('freeMode').checked = false;
    }
    updateBestMoveButtonState();
    updateUndoRedoButtonStates();
    if (autoMoveEnabled && currentPlayer === 'white') {
        makeAutoMove();
    }
}

function toggleFreeMode() {
    freeModeEnabled = !freeModeEnabled;
    if (freeModeEnabled) {
        autoMoveEnabled = false;
        document.getElementById('autoMove').checked = false;
    }
    updateBestMoveButtonState();
    updateUndoRedoButtonStates();
    drawBoard();
}

// Modify the canvas click event listener
canvas.addEventListener('click', (event) => {
    const { row, col } = getClickedSquare(event);
    
    if (freeModeEnabled || currentPlayer === 'white') {
        if (selectedPiece) {
            if (validMoves.some(move => move.row === row && move.col === col)) {
                makeMove(selectedPiece, { row, col });
                selectedPiece = null;
                validMoves = [];
            } else {
                // Deselect the piece if clicking on an invalid move
                selectedPiece = null;
                validMoves = [];
            }
        } else if (board[row][col] !== ' ' && (freeModeEnabled || board[row][col] === board[row][col].toUpperCase())) {
            // Select the piece
            selectedPiece = { row, col };
            validMoves = getValidMoves(selectedPiece);
        }
        drawBoard();
    }
});

function initGame() {
    window.chessBot = new ChessBot(board);
    window.moveAnalysisEnabled = false;
    updateBestMoveButtonState();
    updateUndoRedoButtonStates();
    drawBoard();
}

initGame();

function showBestMove() {
    if (window.moveAnalysisEnabled && window.chessBot) {
        const bestMove = window.chessBot.getBestMove(3); // Adjust depth as needed
        if (bestMove) {
            highlightBestMove(bestMove);
            lastThoughts = window.chessBot.thoughts;
            displayThoughts(lastThoughts);
        }
    }
}

function displayThoughts(thoughts) {
    if (typeof ctx !== 'undefined' && typeof SQUARE_SIZE !== 'undefined') {
        thoughts.forEach((thought, index) => {
            const alpha = Math.max(0.1, 1 - index * 0.1); // Fade out older thoughts
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo((thought.from.col + 0.5) * SQUARE_SIZE, (thought.from.row + 0.5) * SQUARE_SIZE);
            ctx.lineTo((thought.to.col + 0.5) * SQUARE_SIZE, (thought.to.row + 0.5) * SQUARE_SIZE);
            ctx.stroke();

            // Display score
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.font = '12px Arial';
            ctx.fillText(thought.score.toFixed(1), (thought.to.col + 0.5) * SQUARE_SIZE, (thought.to.row + 0.5) * SQUARE_SIZE);
        });
    }
}

function toggleMoveAnalysis() {
    window.moveAnalysisEnabled = !window.moveAnalysisEnabled;
    if (window.moveAnalysisEnabled) {
        showBestMove();
    } else {
        lastThoughts = [];
        drawBoard();
    }
}

function updateMoveHistoryTable() {
    const tbody = document.querySelector('#moveHistory tbody');
    tbody.innerHTML = '';
    moveHistory.forEach((move, index) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = index + 1;
        row.insertCell(1).textContent = move[0];
        row.insertCell(2).textContent = move[1];
    });
}

function makeBestMove() {
    if (currentPlayer === 'white' && !autoMoveEnabled) {
        const bestMove = window.chessBot.getBestMove(DEPTH);
        if (bestMove) {
            makeMove(bestMove.from, bestMove.to);
        }
    }
}

function updateBestMoveButtonState() {
    const bestMoveButton = document.getElementById('bestMoveButton');
    bestMoveButton.disabled = currentPlayer !== 'white' || autoMoveEnabled;
}

function undoMove() {
    if (moveStack.length > 0) {
        const move = moveStack.pop();
        redoStack.push(move);

        board[move.from.row][move.from.col] = move.piece;
        board[move.to.row][move.to.col] = move.capturedPiece;

        currentPlayer = move.currentPlayer;

        // Update the bot's board
        if (window.chessBot) {
            window.chessBot.board = board;
        }

        // Remove the last move from history
        if (currentPlayer === 'black') {
            moveHistory.pop();
        } else {
            moveHistory[moveHistory.length - 1][1] = '';
        }
        updateMoveHistoryTable();

        drawBoard();
        updateUndoRedoButtonStates();
        updateBestMoveButtonState();
    }
}

function redoMove() {
    if (redoStack.length > 0) {
        const move = redoStack.pop();
        makeMove(move.from, move.to);
    }
}

function updateUndoRedoButtonStates() {
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');

    undoButton.disabled = moveStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
}