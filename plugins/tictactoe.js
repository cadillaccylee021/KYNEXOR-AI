// plugins/tictactoe.js
// Tic Tac Toe plugin for WhatsApp bot (lobby, AI, timeouts, leaderboard)
//
// Usage (group):
//  - Start lobby (host):        !tictactoe
//  - Start vs AI (immediate):   !tictactoe ai
//  - Start with opponent:       !tictactoe @username
//  - Join lobby:                !join
//  - Start game (host):         !start
//  - Make move:                 !move 5    (1-9)
//  - Leave/cancel:              !leave / !cancel
//  - Show leaderboard:          !tttboard
//
// Works with your cmd() loader. No DB required (leaderboard stored in ./data/ttt_leaderboard.json).

const { cmd } = require("../command");
const botdb = require("../lib/botdb");

// Simple storage backed by botdb (replaces ttt_leaderboard.json)
function loadBoard() {
  const rows = botdb.getTTTLeaderboard(1000);
  const out = {};
  for (const r of rows) out[r.user_jid] = { wins: r.wins, losses: r.losses, draws: r.draws };
  return out;
}
function saveBoard(board) {
  for (const [uid, s] of Object.entries(board)) {
    if (!uid) continue;
    // Recalculate deltas by comparing to current stored stats
    const cur = botdb.getTTTStats(uid);
    botdb.db.prepare(`INSERT INTO ttt_leaderboard (user_jid,wins,losses,draws) VALUES (?,?,?,?)
      ON CONFLICT(user_jid) DO UPDATE SET wins=excluded.wins,losses=excluded.losses,draws=excluded.draws`)
      .run(uid, s.wins||0, s.losses||0, s.draws||0);
  }
}

// In-memory games store
const games = {};

// Defaults
const JOIN_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes to join
const MOVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per move

// Helpers
const EMOJIS = {
  X: "❌",
  O: "⭕",
  1: "1️⃣",2: "2️⃣",3: "3️⃣",
  4: "4️⃣",5: "5️⃣",6: "6️⃣",
  7: "7️⃣",8: "8️⃣",9: "9️⃣"
};

function renderBoard(board) {
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += EMOJIS[board[i]] || EMOJIS[i + 1];
    if ((i + 1) % 3 === 0) out += "\n";
  }
  return out;
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "tie";
  return null;
}

// Minimax for unbeatable AI
function bestMoveMinimax(board, ai, human) {
  const winner = checkWinner(board);
  if (winner || board.every(Boolean)) return null;

  let bestScore = -Infinity, move = null;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = ai;
      let score = minimax(board, 0, false, ai, human);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}
function minimax(board, depth, isMax, ai, human) {
  const winner = checkWinner(board);
  if (winner === ai) return 10 - depth;
  if (winner === human) return depth - 10;
  if (winner === "tie") return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = ai;
        best = Math.max(best, minimax(board, depth + 1, false, ai, human));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = human;
        best = Math.min(best, minimax(board, depth + 1, true, ai, human));
        board[i] = null;
      }
    }
    return best;
  }
}

// Game lifecycle helpers
function createLobby(from, hostJid, opts = {}) {
  const g = {
    createdAt: Date.now(),
    host: hostJid,
    board: Array(9).fill(null),
    players: {}, // X and O when assigned
    turn: "X",
    started: false,
    ai: !!opts.ai,
    joinTimer: null,
    moveTimer: null,
    pending: [] // list of JIDs waiting
  };
  games[from] = g;
  return g;
}
function clearGame(from) {
  const g = games[from];
  if (!g) return;
  if (g.joinTimer) clearTimeout(g.joinTimer);
  if (g.moveTimer) clearTimeout(g.moveTimer);
  delete games[from];
}
function startJoinTimeout(from, conn, reply) {
  const g = games[from];
  if (!g) return;
  if (g.joinTimer) clearTimeout(g.joinTimer);
  g.joinTimer = setTimeout(() => {
    reply("⏳ Lobby timed out due to inactivity. Cancelled.");
    clearGame(from);
  }, JOIN_TIMEOUT_MS);
}
function startMoveTimeout(from, conn, reply) {
  const g = games[from];
  if (!g) return;
  if (g.moveTimer) clearTimeout(g.moveTimer);
  g.moveTimer = setTimeout(() => {
    // opponent wins
    const loserTurn = g.turn;
    const winner = loserTurn === "X" ? "O" : "X";
    const winnerJid = g.players[winner];
    reply(`⏱️ Move timeout. ${EMOJIS[winner]} <@${(winnerJid||"unknown").split("@")[0]}> wins by timeout!\n\n` + renderBoard(g.board), { mentions: winnerJid ? [winnerJid] : [] });
    // update leaderboard
    const lb = loadBoard();
    if (winnerJid && winnerJid !== "AI") {
      lb[winnerJid] = (lb[winnerJid] || 0) + 1;
      saveBoard(lb);
    }
    clearGame(from);
  }, MOVE_TIMEOUT_MS);
}

// Normalize a jid or mention
function mentionName(jid) {
  if (!jid) return "unknown";
  return `@${jid.split("@")[0]}`;
}

// Command: create / quick start
cmd({
  pattern: "tictactoe",
  desc: "Create TicTacToe lobby or play vs AI or start with a mentioned user",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, args, sender, reply, isGroup }) => {
  try {
    if (!isGroup) return reply("This command only works in groups.");

    // if a game already running
    if (games[from] && games[from].started) return reply("A game is already running in this group.");

    // If mention present => quick start vs mentioned
    const mentioned = (m.mentionedJid && m.mentionedJid.length) ? m.mentionedJid[0] : null;
    const arg0 = args && args[0] ? args[0].toLowerCase() : "";

    if (mentioned) {
      // start game immediate: sender X, mentioned O
      const g = createLobby(from, sender, { ai: false });
      g.players.X = sender;
      g.players.O = mentioned;
      g.started = true;
      // start move timeout
      startMoveTimeout(from, conn, reply);
      return reply(`🎮 Tic Tac Toe — Game started!\n\nPlayers:\nX: ${mentionName(g.players.X)}\nO: ${mentionName(g.players.O)}\n\n${renderBoard(g.board)}\nTurn: ${mentionName(g.players[g.turn])}`, { mentions: [g.players.X, g.players.O] });
    }

    if (arg0 === "ai") {
      // start vs AI immediately: player is X, AI is O
      const g = createLobby(from, sender, { ai: true });
      g.players.X = sender;
      g.players.O = "AI";
      g.started = true;
      // If AI goes first (we'll always start with X by default), so X is human
      startMoveTimeout(from, conn, reply);
      return reply(`🎮 Tic Tac Toe vs AI — Game started!\n\nYou: ${mentionName(g.players.X)} (❌)\nAI: ⭕\n\n${renderBoard(g.board)}\nTurn: ${mentionName(g.players[g.turn])}`, { mentions: [g.players.X] });
    }

    // otherwise create lobby waiting for join
    if (games[from]) {
      return reply("A lobby already exists. Type !join to join it or !cancel to cancel.");
    }
    const g = createLobby(from, sender, { ai: false });
    g.pending.push(sender);
    startJoinTimeout(from, conn, reply);
    return reply(`🎮 Tic Tac Toe lobby created by ${mentionName(sender)}.\nType !join to join the game. Host can type !start to begin or mention a user with !tictactoe @user to start immediately.\nLobby will auto-cancel after 2 minutes.`, { mentions: [sender] });
  } catch (e) {
    console.error("TTT.create error", e);
    reply("Error starting lobby.");
  }
});

// Command: join
cmd({
  pattern: "ttt",
  desc: "Join a TicTacToe lobby",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply, isGroup }) => {
  try {
    if (!isGroup) return reply("Use this in a group.");
    const g = games[from];
    if (!g) return reply("No active lobby in this group. Start with !tictactoe");

    if (g.started) return reply("Game already started.");
    // if already joined
    if (g.pending.includes(sender)) return reply("You already joined the lobby.");
    g.pending.push(sender);

    // If two distinct players -> assign and start
    // ensure unique participants
    const unique = [...new Set(g.pending)];
    if (unique.length >= 2) {
      // assign first two as X and O (host first)
      g.players.X = unique[0];
      g.players.O = unique[1];
      g.started = true;
      // clear join timer and start move timer
      if (g.joinTimer) clearTimeout(g.joinTimer);
      startMoveTimeout(from, conn, reply);
      return reply(`🎮 Tic Tac Toe — Game started!\n\nPlayers:\nX: ${mentionName(g.players.X)}\nO: ${mentionName(g.players.O)}\n\n${renderBoard(g.board)}\nTurn: ${mentionName(g.players[g.turn])}`, { mentions: [g.players.X, g.players.O] });
    } else {
      // still waiting
      startJoinTimeout(from, conn, reply);
      return reply(`${mentionName(sender)} joined the lobby. Waiting for one more player...`);
    }
  } catch (e) {
    console.error("TTT.join err", e);
    reply("Error joining lobby.");
  }
});

// Command: start (host forces start if two players pending)
cmd({
  pattern: "start",
  desc: "Start the lobby (host)",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply, isGroup }) => {
  try {
    if (!isGroup) return reply("Use this in a group.");
    const g = games[from];
    if (!g) return reply("No active lobby.");
    if (g.started) return reply("Game already started.");
    if (g.host !== sender) return reply("Only the host can start the game.");

    const unique = [...new Set(g.pending)];
    if (unique.length < 2) return reply("Need 2 players to start. Ask someone to !join.");

    g.players.X = unique[0];
    g.players.O = unique[1];
    g.started = true;
    if (g.joinTimer) clearTimeout(g.joinTimer);
    startMoveTimeout(from, conn, reply);
    return reply(`🎮 Tic Tac Toe — Game started by host!\n\nPlayers:\nX: ${mentionName(g.players.X)}\nO: ${mentionName(g.players.O)}\n\n${renderBoard(g.board)}\nTurn: ${mentionName(g.players[g.turn])}`, { mentions: [g.players.X, g.players.O] });
  } catch (e) {
    console.error("TTT.start err", e);
    reply("Error starting game.");
  }
});

// Command: leave (or resign)
cmd({
  pattern: "leave|resign",
  desc: "Leave lobby or resign an ongoing game",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply, isGroup }) => {
  try {
    if (!isGroup) return reply("Use this in a group.");
    const g = games[from];
    if (!g) return reply("Nothing to leave.");

    // If game not started, remove from pending
    if (!g.started) {
      g.pending = g.pending.filter(p => p !== sender);
      if (g.host === sender) {
        // host left -> cancel lobby
        clearGame(from);
        return reply("Host left. Lobby cancelled.");
      }
      return reply("You left the lobby.");
    }

    // If during game, resign -> opponent wins
    const playerSide = Object.keys(g.players).find(k => g.players[k] === sender);
    if (!playerSide) return reply("You're not a player in this game.");

    const winnerSide = playerSide === "X" ? "O" : "X";
    const winnerJid = g.players[winnerSide];
    reply(`⚠️ ${mentionName(sender)} resigned. ${EMOJIS[winnerSide]} ${mentionName(winnerJid)} wins!\n\n${renderBoard(g.board)}`, { mentions: winnerJid ? [winnerJid] : [] });

    // update leaderboard
    const lb = loadBoard();
    if (winnerJid && winnerJid !== "AI") {
      lb[winnerJid] = (lb[winnerJid] || 0) + 1;
      saveBoard(lb);
    }
    clearGame(from);
  } catch (e) {
    console.error("TTT.leave err", e);
    reply("Error leaving/resigning.");
  }
});

// Command: cancel (host or god)
cmd({
  pattern: "cancel",
  desc: "Cancel the lobby or game (host or owner)",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply, isGroup, isOwner, isAdmin }) => {
  try {
    if (!isGroup) return reply("Use this in a group.");
    const g = games[from];
    if (!g) return reply("No active lobby/game.");

    // allow host, owner (bot owner), or global god (if available)
    const godCheck = (typeof global.isGod === "function") ? global.isGod(sender.split("@")[0]) : false;
    if (g.host !== sender && !isOwner && !godCheck) return reply("Only the host or bot owner can cancel.");

    clearGame(from);
    return reply("Lobby/game cancelled by host/owner.");
  } catch (e) {
    console.error("TTT.cancel err", e);
    reply("Error cancelling.");
  }
});

// Command: move
cmd({
  pattern: "move",
  desc: "Make a move (1-9)",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, args, sender, reply, isGroup, isOwner }) => {
  try {
    if (!isGroup) return reply("Use this in a group.");
    const g = games[from];
    if (!g || !g.started) return reply("No ongoing game in this group. Start with !tictactoe");

    // Validate numeric arg
    const pos = parseInt(args[0], 10);
    if (isNaN(pos) || pos < 1 || pos > 9) return reply("Choose a number from 1 to 9 for the cell.");

    // Check it's player's turn
    const side = Object.keys(g.players).find(k => g.players[k] === sender);
    if (!side) return reply("You're not a player in this game.");
    if (g.turn !== side) return reply("Not your turn.");

    const idx = pos - 1;
    if (g.board[idx]) return reply("That cell is already taken.");

    // Make move
    g.board[idx] = side;

    // Clear and restart move timer
    if (g.moveTimer) clearTimeout(g.moveTimer);

    // Check winner
    const winner = checkWinner(g.board);
    if (winner) {
      if (winner === "tie") {
        reply(`🤝 It's a tie!\n\n${renderBoard(g.board)}`);
      } else {
        const winnerJid = g.players[winner];
        reply(`🏆 Winner: ${EMOJIS[winner]} ${mentionName(winnerJid)}\n\n${renderBoard(g.board)}`, { mentions: winnerJid ? [winnerJid] : [] });

        // update leaderboard
        const lb = loadBoard();
        if (winnerJid && winnerJid !== "AI") {
          lb[winnerJid] = (lb[winnerJid] || 0) + 1;
          saveBoard(lb);
        }
      }
      clearGame(from);
      return;
    }

    // Switch turn
    g.turn = (g.turn === "X") ? "O" : "X";

    // AI move if applicable
    if (g.ai && g.players[g.turn] === "AI") {
      // AI's symbol
      const ai = "O";
      const human = "X";
      // Unbeatable move
      const aiMove = bestMoveMinimax(g.board.slice(), ai, human);
      if (aiMove !== null) g.board[aiMove] = ai;
      // Check after AI
      const winner2 = checkWinner(g.board);
      if (winner2) {
        if (winner2 === "tie") {
          reply(`🤝 It's a tie!\n\n${renderBoard(g.board)}`);
        } else {
          reply(`🏆 Winner: ${EMOJIS[winner2]} ${g.players[winner2] === "AI" ? "AI" : mentionName(g.players[winner2])}\n\n${renderBoard(g.board)}`);
          // update leaderboard (if human lost, AI not counted)
          const lb = loadBoard();
          const winnerJid = g.players[winner2];
          if (winnerJid && winnerJid !== "AI") {
            lb[winnerJid] = (lb[winnerJid] || 0) + 1;
            saveBoard(lb);
          }
        }
        clearGame(from);
        return;
      }
      // after AI move, set turn back to human
      g.turn = (g.turn === "X") ? "O" : "X";
    }

    // Restart move timer for the next player
    startMoveTimeout(from, conn, reply);

    // Reply with board and next turn
    const nextJid = g.players[g.turn];
    reply(`🎮 Tic Tac Toe\n\n${renderBoard(g.board)}\nTurn: ${mentionName(nextJid)}`, { mentions: nextJid && nextJid !== "AI" ? [nextJid] : [] });
  } catch (e) {
    console.error("TTT.move err", e);
    reply("Error processing move.");
  }
});

// Command: leaderboard
cmd({
  pattern: "tttboard|leaderboard",
  desc: "Show TicTacToe leaderboard",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const lb = loadBoard();
    const entries = Object.entries(lb).sort((a,b) => b[1] - a[1]).slice(0,20);
    if (!entries.length) return reply("No leaderboard data yet.");
    let out = "🏆 Tic Tac Toe Leaderboard\n\n";
    for (let i=0;i<entries.length;i++){
      out += `${i+1}. ${mentionName(entries[i][0])} — ${entries[i][1]}\n`;
    }
    reply(out);
  } catch (e) {
    console.error("TTT.board err", e);
    reply("Error loading leaderboard.");
  }
});