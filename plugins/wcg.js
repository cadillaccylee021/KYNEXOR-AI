// plugins/wcg.js
// Word Chain Game (WCG) plugin
// - lobby (start/join)
// - AI opponent
// - progressive length increase from 3 -> 15 over time
// - bot chooses starting letter each turn (not previous word's last letter)
// - spam detection (immediate repeat by same player) -> warns only
// - manual stop command (wcgstop)
// - end-of-game summary: winner's answered count, overall longest word, words count per player
// - preserves backward compatibility with previous behaviour where possible

const axios = require("axios");
const { cmd } = require("../command");
const config = require("../config");
const prefix = config.PREFIX || "/";
const botdb  = require("../lib/botdb");

/* ---------------- botdb helpers (replaces JSON load/save) ---------------- */
function load(type) {
  if (type === 'db')    return botdb.db.prepare("SELECT group_jid,state FROM wcg_games").all().reduce((a,r)=>{try{a[r.group_jid]=JSON.parse(r.state);}catch(_){}return a;},{});
  if (type === 'stats') return botdb.db.prepare("SELECT user_jid,wins,losses,played FROM wcg_stats").all().reduce((a,r)=>{a[r.user_jid]={wins:r.wins,losses:r.losses,played:r.played};return a;},{});
  return {};
}
function loadGame(gid)        { return botdb.getWCGGame(gid) || {}; }
function saveGame(gid, state) { botdb.setWCGGame(gid, state); }
function deleteGame(gid)      { botdb.deleteWCGGame(gid); }
function loadStats()          { return load('stats'); }
function saveStats(stats) {
  for (const [uid, s] of Object.entries(stats)) {
    botdb.db.prepare(`INSERT INTO wcg_stats (user_jid,wins,losses,played) VALUES (?,?,?,?)
      ON CONFLICT(user_jid) DO UPDATE SET wins=excluded.wins,losses=excluded.losses,played=excluded.played`)
      .run(uid, s.wins||0, s.losses||0, s.played||0);
  }
}
function saveAllGames(db) {
  for (const [gid, state] of Object.entries(db)) {
    if (state) botdb.setWCGGame(gid, state);
    else botdb.deleteWCGGame(gid);
  }
}

const MAX_PLAYERS   = 20;
const JOIN_TIMEOUT  = 50000;
const TURN_TIMEOUT  = 30000;
const startTimers   = {};
const turnTimers    = {};
const aiThinkDelay  = 1200;
function clearTimer(timerMap, id) {
  if (timerMap[id]) {
    clearTimeout(timerMap[id]);
    delete timerMap[id];
  }
}

/* ---------------- dictionary & suggestion helpers ---------------- */
async function isValidWord(word) {
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    return Array.isArray(res.data) && res.data.length > 0;
  } catch {
    return false;
  }
}
async function getSuggestionStartsWith(letter, minLen) {
  try {
    // datamuse: words that start with letter
    const res = await axios.get(`https://api.datamuse.com/words?sp=${encodeURIComponent(letter)}*&max=40`);
    const suggestions = (res.data || []).map(x => x.word).filter(w => w.length >= minLen);
    for (let w of suggestions) {
      if (await isValidWord(w)) return w;
    }
    return null;
  } catch {
    return null;
  }
}

/* ---------------- game helpers ---------------- */
function getNextTurn(game) {
  return (game.turn + 1) % game.players.length;
}

// progressive minLen calculation based on game.level
// level 1 => minLen 3, level 2 => 4, ... cap at 15
function computeMinLen(level, base = 3) {
  const min = base + (level - 1);
  return Math.min(15, min);
}

// increase level after N accepted words to slowly make the game harder.
// we'll increment level every 4 accepted words by default.
const LEVEL_UP_THRESHOLD = 4;

function updateStats(player, win = false) {
  const stats = loadStats();
  if (!stats[player]) stats[player] = { wins: 0, losses: 0, played: 0 };
  stats[player].played++;
  if (win) stats[player].wins++;
  else stats[player].losses++;
  saveStats(stats);
}
function emojiRank(rank) {
  return ["🥇", "🥈", "🥉"][rank] || "🏅";
}

/* ---------------- turn flow ---------------- */

async function startGame(from, conn) {
  const db = load('db');
  const game = db[from];
  if (!game) return;

  game.waiting = false;
  game.turn = 0;
  game.level = game.level || 1; // progression level
  game.acceptedCount = game.acceptedCount || 0; // track accepted words to level up
  game.lastStartLetter = game.lastStartLetter || randomLetter(); // letter players must start with
  game.lastWord = ""; // last accepted word (for reference)
  game.words = game.words || []; // store all accepted words
  game.byPlayer = game.byPlayer || {}; // map player -> list of words they contributed
  game.wordCounts = game.wordCounts || {}; // counts per player

  // identify bot JID properly
  const botJid = conn?.user?.id ? (conn.user.id.split(":")[0] + "@s.whatsapp.net") : null;

  // AI enabled if only one player or if bot is present among players
  game.aiEnabled = (game.players.length === 1) || (botJid && game.players.includes(botJid) && game.players.length >= 1);

  // ensure bot not first when human exists
  if (botJid && game.players[0] === botJid && game.players.length > 1) {
    const idx = game.players.findIndex(p => p !== botJid);
    if (idx !== -1) [game.players[0], game.players[idx]] = [game.players[idx], game.players[0]];
  }

  saveAllGames(db);

  // announce
  const playersMention = game.players.map(p => "@" + p.split("@")[0]).join(", ");
  try {
    await conn.sendMessage(from, {
      text: `🎮 *Word Chain Game Started!* \nMode: *${(game.mode || "easy").toUpperCase()}*\nPlayers: ${playersMention}\n🎯 First Starter Letter: *${game.lastStartLetter.toUpperCase()}*\n🔢 Starting min length: ${computeMinLen(game.level)}\n\nFirst turn: @${game.players[0].split("@")[0]}`,
      mentions: game.players
    });
  } catch (e) {
    try { await conn.sendMessage(from, { text: `Game started! Players: ${playersMention}` }); } catch {}
  }

  beginTurn(from, conn);
}

function randomLetter() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return letters[Math.floor(Math.random() * letters.length)];
}

async function beginTurn(from, conn) {
  const db = load('db');
  const game = db[from];
  if (!game) return;

  clearTimer(turnTimers, from);

  const botJid = conn?.user?.id ? (conn.user.id.split(":")[0] + "@s.whatsapp.net") : null;
  const currentPlayer = game.players[game.turn];
  const minLen = computeMinLen(game.level);

  // AI move (bot must provide a word starting with game.lastStartLetter)
  if (game.aiEnabled && botJid && currentPlayer === botJid) {
    setTimeout(async () => {
      const startLetter = game.lastStartLetter || randomLetter();
      const nextWord = await getSuggestionStartsWith(startLetter, minLen);
      if (!nextWord) {
        // AI gives up -> other player wins
        await conn.sendMessage(from, { text: `🤖 AI couldn't find a word. Remaining player wins!` });
        const winner = game.players.find(p => p !== botJid) || botJid;
        updateStats(winner, true);
        await endGameAndCleanup(from, conn, `${winner} wins because AI failed.`);
        return;
      }
      // Accept AI word
      game.lastWord = nextWord.toLowerCase();
      game.words.push({ word: game.lastWord, player: botJid });
      game.byPlayer[botJid] = game.byPlayer[botJid] || [];
      game.byPlayer[botJid].push(game.lastWord);
      game.wordCounts[botJid] = (game.wordCounts[botJid] || 0) + 1;
      game.acceptedCount = (game.acceptedCount || 0) + 1;
      // after a successful word, choose a new start letter for next turn (bot chooses)
      game.lastStartLetter = randomLetter();
      await conn.sendMessage(from, { text: `🤖 *AI:* ${game.lastWord.toUpperCase()}\n🔜 Next starter letter: *${game.lastStartLetter.toUpperCase()}*` });
      // level up logic
      if (game.acceptedCount >= LEVEL_UP_THRESHOLD) {
        game.acceptedCount = 0;
        if ((game.level || 1) < 13) { // cap level so minLen doesn't exceed 15
          game.level = (game.level || 1) + 1;
        }
        await conn.sendMessage(from, { text: `⬆️ Difficulty increased. New min length: ${computeMinLen(game.level)}` });
      }
      game.turn = getNextTurn(game);
      saveAllGames(db);
      beginTurn(from, conn);
    }, aiThinkDelay);
    return;
  }

  // announce turn: include required starter letter and min length
  try {
    await conn.sendMessage(from, {
      text: `🎯 @${currentPlayer.split("@")[0]}'s turn!\nStart your word with: *${(game.lastStartLetter || randomLetter()).toUpperCase()}*\nMinimum length: *${minLen}*\n⏳ ${Math.round(TURN_TIMEOUT/1000)}s`,
      mentions: [currentPlayer]
    });
  } catch {
    await conn.sendMessage(from, { text: `It's @${currentPlayer.split("@")[0]}'s turn! Start with ${game.lastStartLetter.toUpperCase()}` });
  }

  // start timeout for this turn
  turnTimers[from] = setTimeout(async () => {
    try {
      await conn.sendMessage(from, {
        text: `⏰ Time's up! @${currentPlayer.split("@")[0]} eliminated!`,
        mentions: [currentPlayer]
      });
    } catch {}
    // eliminate currentPlayer
    const idx = game.players.indexOf(currentPlayer);
    if (idx !== -1) game.players.splice(idx, 1);

    if (game.players.length === 1) {
      const winner = game.players[0];
      try {
        await conn.sendMessage(from, { text: `🏆 Winner: @${winner.split("@")[0]}!`, mentions: [winner] });
      } catch {}
      updateStats(winner, true);
      await endGameAndCleanup(from, conn, `Winner: @${winner.split("@")[0]}`);
      return;
    }

    if (game.turn >= game.players.length) game.turn = 0;
    saveAllGames(db);
    beginTurn(from, conn);
  }, TURN_TIMEOUT);

  saveAllGames(db);
}

/* ---------------- command registrations ---------------- */

// IMPORTANT: pattern must be a simple string the loader can match (not a regex)
cmd({
  pattern: "wcg",
  desc: "Start Word Chain Game",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, args, reply }) => {
  const chat = from || m.key?.remoteJid;
  const who = sender || (m.key?.participant || m.key?.remoteJid);

  const mode = (args && args[0]) ? args[0].toLowerCase() : "easy";
  const db = load('db');

  if (!db[chat]) {
    db[chat] = {
      mode,
      host: who,
      players: [who],
      waiting: true,
      createdAt: Date.now(),
      level: 1,
      acceptedCount: 0,
      lastStartLetter: randomLetter(),
      words: [],
      byPlayer: {},
      wordCounts: {}
    };

    try {
      await conn.sendMessage(chat, { text: `🎉 Word Chain Game started in *${mode.toUpperCase()}* mode!\nType *join* to enter.\nType *wcgstop* to cancel the lobby/game (host only).\n⏳ Game starts in ${Math.round(JOIN_TIMEOUT/1000)}s\nStarter letter: *${db[chat].lastStartLetter.toUpperCase()}*` });
    } catch { if (reply) reply(`🎉 Word Chain Game started in ${mode.toUpperCase()} mode!`); }

    clearTimer(startTimers, chat);
    startTimers[chat] = setTimeout(async () => {
      const local = load('db');
      if (!local[chat] || (local[chat].players || []).length === 0) {
        try { await conn.sendMessage(chat, { text: "❌ No players joined. Game canceled." }); } catch {}
        delete local[chat];
        saveAllGames(local);
        return;
      }
      await startGame(chat, conn);
    }, JOIN_TIMEOUT);

    saveAllGames(db);
  } else {
    if (reply) return reply("⚠️ A game is already active in this chat.");
    try { await conn.sendMessage(chat, { text: "⚠️ A game is already active in this chat." }); } catch {}
  }
});

cmd({
  pattern: "join",
  desc: "Join Word Chain Game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
  const chat = from || m.key?.remoteJid;
  const who = sender || (m.key?.participant || m.key?.remoteJid);
  const db = load('db');
  const game = db[chat];
  if (!game || !game.waiting) return reply ? reply("❌ No game to join.") : await conn.sendMessage(chat, { text: "❌ No game to join." });
  if (game.players.includes(who)) return reply ? reply("⚠️ You're already in.") : await conn.sendMessage(chat, { text: "⚠️ You're already in." });
  if (game.players.length >= MAX_PLAYERS) return reply ? reply("🚫 Game full.") : await conn.sendMessage(chat, { text: "🚫 Game full." });

  game.players.push(who);
  saveAllGames(db);
  try {
    await conn.sendMessage(chat, { text: `✅ @${who.split("@")[0]} joined!`, mentions: [who] });
  } catch {
    if (reply) reply(`✅ ${who.split("@")[0]} joined!`);
  }
});

// manual stop command - host or admin can stop
cmd({
  pattern: "wcgstop",
  desc: "Stop / cancel the WCG lobby or running game (host only)",
  category: "game",
  filename: __filename
}, async (conn, mek, m, { from, sender, reply, isGroup, groupMetadata }) => {
  const chat = from || m.key?.remoteJid;
  const db = load('db');
  const game = db[chat];
  if (!game) return reply("No active game to stop.");
  // allow host or group admin to stop
  const host = game.host;
  let isHost = host === sender;
  let isAdmin = false;
  try {
    if (isGroup && groupMetadata) {
      const admins = (groupMetadata.participants || []).filter(p => p.admin).map(p => p.id);
      isAdmin = admins.includes(sender);
    }
  } catch (e) { /* ignore */ }

  if (!isHost && !isAdmin) return reply("Only the host or a group admin can stop the game.");

  await endGameAndCleanup(chat, conn, "Game stopped by host/admin.");
  return reply("✅ Game stopped.");
});

// stats and leaderboard
cmd({
  pattern: "wcg-stats",
  desc: "Your WCG stats",
  filename: __filename
}, async (conn, mek, m, { sender, reply }) => {
  const stats = loadStats();
  const userStats = stats[sender];
  if (!userStats) return reply ? reply("No stats yet. Play a game!") : await conn.sendMessage(m.key?.remoteJid, { text: "No stats yet." });
  const { wins, losses, played } = userStats;
  return reply ? reply(`📊 *Your Stats*\nPlayed: ${played}\nWins: ${wins}\nLosses: ${losses}`) : await conn.sendMessage(m.key?.remoteJid, { text: `📊 Stats: Played ${played}, Wins ${wins}` });
});

cmd({
  pattern: "leaderboard",
  desc: "WCG Leaderboard",
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  const stats = loadStats();
  const sorted = Object.entries(stats).sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0)).slice(0, 10);
  if (!sorted.length) return reply ? reply("No data yet.") : await conn.sendMessage(m.key?.remoteJid, { text: "No data yet." });
  const list = sorted.map(([id, s], i) => `${emojiRank(i)} @${id.split("@")[0]} - ${s.wins || 0} Wins`).join("\n");
  return reply ? reply(`🏆 *Leaderboard*\n\n${list}`, null, { mentions: sorted.map(([id]) => id) }) : await conn.sendMessage(m.key?.remoteJid, { text: `🏆 Leaderboard\n\n${list}` });
});

/* ---------------- messages listener (for in-game words without prefix) ---------------- */
async function handlePlayerMessage(mek, conn) {
  try {
    if (!mek || !mek.message) return;
    const from = mek.key.remoteJid;
    if (!from) return;
    // skip statuses and broadcasts
    if (!from.endsWith("@g.us")) return; // only group games
    const textVariants = [
      mek.message.conversation,
      mek.message?.extendedTextMessage?.text,
      mek.message?.imageMessage?.caption,
      mek.message?.videoMessage?.caption
    ];
    let text = (textVariants.find(Boolean) || "").trim();
    if (!text) return;
    if (text.startsWith(prefix)) return; // skip prefixed commands

    const db = load('db');
    const game = db[from];
    if (!game || game.waiting) return;

    const sender = mek.key.fromMe ? (conn.user.id.split(":")[0] + "@s.whatsapp.net") : (mek.key.participant || mek.key.remoteJid);
    const currentPlayer = game.players[game.turn];
    if (currentPlayer !== sender) return; // not their turn

    const word = text.toLowerCase().replace(/[^a-z]/gi, "");
    if (!word) return;

    const minLen = computeMinLen(game.level);
    const requiredStart = (game.lastStartLetter || randomLetter()).toLowerCase();

    // spam detection: if player's last word (their previous contribution) equals this word, warn only
    game.byPlayer = game.byPlayer || {};
    const playerWords = game.byPlayer[sender] || [];
    const lastPlayerWord = playerWords.length ? playerWords[playerWords.length - 1] : null;
    if (lastPlayerWord && lastPlayerWord.toLowerCase() === word) {
      await conn.sendMessage(from, { text: `⚠️ Spam detected. You already used that word. Try another one.`, mentions: [sender] });
      return; // no penalty, keep turn running
    }

    // check starting letter
    if (!word.startsWith(requiredStart)) {
      await conn.sendMessage(from, { text: `❌ Word must start with *${requiredStart.toUpperCase()}*.`, mentions: [sender] });
      return;
    }

    // check length
    if (word.length < minLen) {
      await conn.sendMessage(from, { text: `❗ Word must be at least ${minLen} letters long.`, mentions: [sender] });
      return;
    }

    // check valid word via dictionary
    const valid = await isValidWord(word);
    if (!valid) {
      await conn.sendMessage(from, { text: `❌ Invalid English word. Try again.`, mentions: [sender] });
      return;
    }

    // Accepted word: store
    game.lastWord = word;
    game.words = game.words || [];
    game.words.push({ word, player: sender, ts: Date.now() });
    game.byPlayer[sender] = game.byPlayer[sender] || [];
    game.byPlayer[sender].push(word);
    game.wordCounts = game.wordCounts || {};
    game.wordCounts[sender] = (game.wordCounts[sender] || 0) + 1;
    game.acceptedCount = (game.acceptedCount || 0) + 1;

    // announce acceptance and stats
    await conn.sendMessage(from, { text: `✅ Word *${word.toUpperCase()}* accepted!` });

    // choose next starter letter randomly (bot chooses per request)
    game.lastStartLetter = randomLetter();

    // level up if threshold reached
    if (game.acceptedCount >= LEVEL_UP_THRESHOLD) {
      game.acceptedCount = 0;
      if ((game.level || 1) < 13) {
        game.level = (game.level || 1) + 1;
        await conn.sendMessage(from, { text: `⬆️ Difficulty increased. New min length: ${computeMinLen(game.level)}` });
      }
    }

    // advance turn
    game.turn = getNextTurn(game);

    // clear current turn timer and restart next turn flow
    clearTimer(turnTimers, from);
    saveAllGames(db);

    // if only one player left -> end
    if (game.players.length === 1) {
      const winner = game.players[0];
      await conn.sendMessage(from, { text: `🏆 Winner: @${winner.split("@")[0]}!`, mentions: [winner] });
      updateStats(winner, true);
      await endGameAndCleanup(from, conn, `Winner: @${winner.split("@")[0]}`);
      return;
    }

    beginTurn(from, conn);

  } catch (e) {
    console.error("WCG listener error:", e);
  }
}

function registerWCG(conn) {
  conn.ev.on("messages.upsert", async (up) => {
    try {
      const mek = up.messages[0];
      await handlePlayerMessage(mek, conn);
    } catch (e) {
      console.error("WCG: handler error", e);
    }
  });
  console.log("✅ WCG: registered messages.upsert listener.");
}

/* ---------------- end-game summary & cleanup ---------------- */

async function endGameAndCleanup(from, conn, reasonText = "Game ended") {
  try {
    const db = load('db');
    const game = db[from];
    if (!game) {
      // ensure we clear timers anyway
      clearTimer(startTimers, from);
      clearTimer(turnTimers, from);
      return;
    }

    // compute winner: player with highest wordCounts (if players left, pick last standing)
    let winner = null;
    if (game.players && game.players.length === 1) winner = game.players[0];
    // otherwise choose highest wordCounts
    if (!winner) {
      const counts = game.wordCounts || {};
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length) winner = sorted[0][0];
    }

    // compute longest word overall
    const allWords = game.words || [];
    const longest = allWords.reduce((acc, cur) => {
      if (!acc || (cur.word && cur.word.length > acc.word.length)) return cur;
      return acc;
    }, null);

    // winner answered count
    const winnerCount = (game.wordCounts && winner) ? (game.wordCounts[winner] || 0) : 0;

    // build per-player results
    const results = [];
    const playersSeen = new Set();
    if (game.byPlayer) {
      for (const p of Object.keys(game.byPlayer)) {
        playersSeen.add(p);
        results.push({ player: p, count: game.wordCounts[p] || game.byPlayer[p].length, words: game.byPlayer[p] });
      }
    }
    // include any players left who didn't play words
    if (game.players) {
      for (const p of game.players) {
        if (!playersSeen.has(p)) results.push({ player: p, count: game.wordCounts[p] || 0, words: game.byPlayer[p] || [] });
      }
    }

    // format summary
    let summary = `🔚 *Game Ended* — ${reasonText}\n\n`;
    if (winner) summary += `🏆 Winner: @${winner.split("@")[0]} — ${winnerCount} word(s)\n`;
    summary += `📦 Longest word: ${longest ? `*${longest.word.toUpperCase()}* by @${longest.player.split("@")[0]} (${longest.word.length} letters)` : "N/A"}\n\n`;
    summary += `📊 Final per-player counts:\n`;
    results.sort((a,b) => b.count - a.count);
    for (const r of results) {
      summary += `• @${r.player.split("@")[0]} — ${r.count} word(s)\n`;
    }
    summary += `\nThanks for playing!`;

    // send summary with mentions
    const mentions = results.map(r => r.player);
    try {
      await conn.sendMessage(from, { text: summary, mentions });
    } catch (e) {
      try { await conn.sendMessage(from, { text: summary }); } catch {}
    }

    // update stats persistence for winner
    if (winner) updateStats(winner, true);

    // cleanup timers and DB entry
    clearTimer(startTimers, from);
    clearTimer(turnTimers, from);
    delete db[from];
    saveAllGames(db);

  } catch (e) {
    console.error("WCG end/cleanup error", e);
  }
}

module.exports = { registerWCG, startGame, beginTurn };