class ChessBot {
    constructor(board) {
        this.board = board;
        this.thoughts = [];
        this.positionHistory = [];
    }

    getBestMove(depth) {
        this.thoughts = [];
        let bestMove = null;
        let bestScore = -Infinity;
        let equalMoves = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] !== ' ' && this.board[row][col] === this.board[row][col].toUpperCase()) {
                    const moves = this.getValidMoves({row, col}, this.board);
                    for (const move of moves) {
                        const tempBoard = this.copyBoard(this.board);
                        this.makeMove(tempBoard, {row, col}, move);
                        const score = this.minimax(tempBoard, depth - 1, -Infinity, Infinity, false);
                        
                        this.thoughts.push({from: {row, col}, to: move, score: score});
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = {from: {row, col}, to: move};
                            equalMoves = [bestMove];
                        } else if (score === bestScore) {
                            equalMoves.push({from: {row, col}, to: move});
                        }
                    }
                }
            }
        }

        // Choose a random move from equally good moves
        bestMove = equalMoves[Math.floor(Math.random() * equalMoves.length)];

        // Check for draw by repetition
        if (this.isDrawByRepetition(this.board, bestMove)) {
            // If draw by repetition, choose the second-best move
            equalMoves = equalMoves.filter(m => m !== bestMove);
            if (equalMoves.length > 0) {
                bestMove = equalMoves[Math.floor(Math.random() * equalMoves.length)];
            }
        }

        return bestMove;
    }

    getBestMoveForBlack(depth) {
        this.thoughts = [];
        let bestMove = null;
        let bestScore = Infinity;
        let equalMoves = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] !== ' ' && this.board[row][col] === this.board[row][col].toLowerCase()) {
                    const moves = this.getValidMoves({row, col}, this.board);
                    for (const move of moves) {
                        const tempBoard = this.copyBoard(this.board);
                        this.makeMove(tempBoard, {row, col}, move);
                        const score = this.minimax(tempBoard, depth - 1, -Infinity, Infinity, true);
                        
                        this.thoughts.push({from: {row, col}, to: move, score: score});
                        
                        if (score < bestScore) {
                            bestScore = score;
                            bestMove = {from: {row, col}, to: move};
                            equalMoves = [bestMove];
                        } else if (score === bestScore) {
                            equalMoves.push({from: {row, col}, to: move});
                        }
                    }
                }
            }
        }

        // Choose a random move from equally good moves
        bestMove = equalMoves[Math.floor(Math.random() * equalMoves.length)];

        // Check for draw by repetition
        if (this.isDrawByRepetition(this.board, bestMove)) {
            // If draw by repetition, choose the second-best move
            equalMoves = equalMoves.filter(m => m !== bestMove);
            if (equalMoves.length > 0) {
                bestMove = equalMoves[Math.floor(Math.random() * equalMoves.length)];
            }
        }

        return bestMove;
    }

    minimax(board, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) {
            return this.evaluateBoard(board);
        }

        if (isMaximizingPlayer) {
            let bestScore = -Infinity;
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    if (board[row][col] !== ' ' && board[row][col] === board[row][col].toUpperCase()) {
                        const moves = this.getValidMoves({row, col}, board);
                        for (const move of moves) {
                            const tempBoard = this.copyBoard(board);
                            this.makeMove(tempBoard, {row, col}, move);
                            const score = this.minimax(tempBoard, depth - 1, alpha, beta, false);
                            bestScore = Math.max(bestScore, score);
                            alpha = Math.max(alpha, bestScore);
                            if (beta <= alpha) {
                                break;
                            }
                        }
                    }
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    if (board[row][col] !== ' ' && board[row][col] === board[row][col].toLowerCase()) {
                        const moves = this.getValidMoves({row, col}, board);
                        for (const move of moves) {
                            const tempBoard = this.copyBoard(board);
                            this.makeMove(tempBoard, {row, col}, move);
                            const score = this.minimax(tempBoard, depth - 1, alpha, beta, true);
                            bestScore = Math.min(bestScore, score);
                            beta = Math.min(beta, bestScore);
                            if (beta <= alpha) {
                                break;
                            }
                        }
                    }
                }
            }
            return bestScore;
        }
    }

    displayThoughts() {
        const thoughtsDisplay = document.getElementById('thoughtsDisplay');
        thoughtsDisplay.innerHTML = this.thoughts.join('<br>');
    }

    evaluateBoard(board) {
        const pieceValues = {
            'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': -100,
            'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 100
        };

        let score = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] !== ' ') {
                    score += pieceValues[board[row][col]];
                    score += this.getPiecePositionBonus(board[row][col], row, col);
                }
            }
        }
        return score;
    }

    getPiecePositionBonus(piece, row, col) {
        const pawnPositionBonus = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        const knightPositionBonus = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        const bishopPositionBonus = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];

        const rookPositionBonus = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ];

        const queenPositionBonus = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ];

        const kingPositionBonus = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ];

        let bonus = 0;
        switch (piece.toLowerCase()) {
            case 'p':
                bonus = pawnPositionBonus[row][col];
                break;
            case 'n':
                bonus = knightPositionBonus[row][col];
                break;
            case 'b':
                bonus = bishopPositionBonus[row][col];
                break;
            case 'r':
                bonus = rookPositionBonus[row][col];
                break;
            case 'q':
                bonus = queenPositionBonus[row][col];
                break;
            case 'k':
                bonus = kingPositionBonus[row][col];
                break;
        }

        return piece === piece.toUpperCase() ? bonus : -bonus;
    }

    isDrawByRepetition(board, move) {
        const newPosition = this.getBoardString(board);
        this.positionHistory.push(newPosition);
        
        // Check if the same position has occurred 3 times
        if (this.positionHistory.filter(pos => pos === newPosition).length >= 3) {
            return true;
        }
        
        // Keep only the last 10 positions to limit memory usage
        if (this.positionHistory.length > 10) {
            this.positionHistory.shift();
        }
        
        return false;
    }

    getBoardString(board) {
        return board.map(row => row.join('')).join('');
    }

    copyBoard(board) {
        return board.map(row => [...row]);
    }

    makeMove(board, from, to) {
        board[to.row][to.col] = board[from.row][from.col];
        board[from.row][from.col] = ' ';
    }

    getValidMoves(piece, board) {
        const moves = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.isValidMove(piece, {row, col}, board)) {
                    moves.push({row, col});
                }
            }
        }
        return moves;
    }

    isValidMove(from, to, board) {
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
                return (dx === 0 || dy === 0) && this.isPathClear(from, to, board);
            case 'n':
                // Knight logic
                return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
            case 'b':
                // Bishop logic
                return Math.abs(dx) === Math.abs(dy) && this.isPathClear(from, to, board);
            case 'q':
                // Queen logic
                return ((dx === 0 || dy === 0) || (Math.abs(dx) === Math.abs(dy))) && this.isPathClear(from, to, board);
            case 'k':
                // King logic
                return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        }
    }

    isPathClear(from, to, board) {
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
}