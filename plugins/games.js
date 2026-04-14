// plugins/games.js
// Commands: guessage, guesscountry, guessgender, guess, cfg, delcfg,
//           co (capital), hcg, delhcg, dice, gtc
// SKIPPED: ttt/delttt (exists), wcg/delwcg (exists)
//
// IMPORTANT: Add this to index.js message handler (same place as checkAfkMention etc.):
//   const { handleGameText } = require('./plugins/games');
//   await handleGameText(conn, mek, m, { from, sender, body });
'use strict';

const axios  = require('axios');
const fetch  = require('node-fetch');
const { cmd } = require('../command');

// ══════════════════════════════════════════════════════════════════════════════
// NAME GUESSING COMMANDS  (agify / nationalize / genderize — all free, no key)
// ══════════════════════════════════════════════════════════════════════════════

cmd({
  pattern:  'guessage',
  alias:    ['ageguess'],
  desc:     'Guess the age of a person based on their name',
  category: 'fun',
  use:      '<name>',
  filename: __filename,
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!q) return reply('*Provide a name!*\nExample: :guessage John');
    const { data } = await axios.get(`https://api.agify.io/?name=${encodeURIComponent(q.trim())}`);
    reply(
      `*🔢 Age Guesser*\n\n` +
      `*Name:* ${data.name}\n` +
      `*Estimated Age:* ${data.age ?? 'Unknown'}\n` +
      `*Data Count:* ${data.count}`
    );
  } catch (e) { reply('Error: ' + e.message); }
});

cmd({
  pattern:  'guesscountry',
  alias:    ['namecountry'],
  desc:     'Guess the likely countries associated with a name',
  category: 'fun',
  use:      '<name>',
  filename: __filename,
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!q) return reply('*Provide a name!*\nExample: :guesscountry Fatima');
    const { data } = await axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(q.trim())}`);
    let out = `*🌍 Country Guesser*\n\n*Name:* ${data.name}\n*Count:* ${data.count}\n*Likely Countries:*\n`;
    (data.country || []).forEach((c, i) => {
      out += `\n${i + 1}. ${c.country_id} (${(c.probability * 100).toFixed(1)}%)`;
    });
    reply(out);
  } catch (e) { reply('Error: ' + e.message); }
});

cmd({
  pattern:  'guessgender',
  alias:    ['namegender'],
  desc:     'Guess the gender of a person based on their name',
  category: 'fun',
  use:      '<name>',
  filename: __filename,
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!q) return reply('*Provide a name!*\nExample: :guessgender Sarah');
    const { data } = await axios.get(`https://api.genderize.io/?name=${encodeURIComponent(q.trim())}`);
    reply(
      `*⚥ Gender Guesser*\n\n` +
      `*Name:* ${data.name}\n` +
      `*Gender:* ${data.gender ?? 'Unknown'}\n` +
      `*Probability:* ${((data.probability ?? 0) * 100).toFixed(1)}%\n` +
      `*Count:* ${data.count}`
    );
  } catch (e) { reply('Error: ' + e.message); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NUMBER GUESSING GAME
// ══════════════════════════════════════════════════════════════════════════════

const numGuessGames = {}; // { [jid]: { player, randomNumber, mode, attempts, status } }

const NUMGUESS_LOGO = `█▄ █ █   █  █▄ ▄█  ██▄ ██▀ █▀▄\n█ ▀█ █▄█  █  ▀  █  █▄█ █▄▄ █▀▄`;

cmd({
  pattern:  'numguess',
  alias:    ['nguess', 'guessnumber'],
  desc:     'Play a number guessing game',
  category: 'game',
  use:      '<easy | medium | hard | end>',
  filename: __filename,
}, async (conn, mek, m, { from, sender, q, reply }) => {
  try {
    const input    = (q || '').toLowerCase().trim();
    const existing = numGuessGames[from];

    if (input === 'end') {
      if (!existing) return reply('*No game is running in this chat.*');
      const canEnd = existing.player === sender || m.isOwner;
      if (!canEnd) return reply("*You're not the player of the running game!*");
      delete numGuessGames[from];
      return reply('*Number Guessing Game ended. Goodbye!*');
    }

    if (existing?.status) return reply('*A game is already in progress!*\nTo end: :numguess end');

    let max = 0, mode = '';
    if (input.includes('easy'))   { max = 100;   mode = 'Easy';   }
    else if (input.includes('medium')) { max = 1000;  mode = 'Medium'; }
    else if (input.includes('hard'))   { max = 10000; mode = 'Hard';   }
    else return reply(
      NUMGUESS_LOGO + '\n   𝗡𝘂𝗺𝗯𝗲𝗿 𝗚𝘂𝗲𝘀𝘀𝗶𝗻𝗴 𝗚𝗮𝗺𝗲 𝗠𝗲𝗻𝘂\n\n' +
      '*Choose a mode:*\n  ▢ Easy   (0–100)\n  ▢ Medium (0–1000)\n  ▢ Hard   (0–10000)\n  ▢ End    (end game)'
    );

    numGuessGames[from] = { player: sender, randomNumber: Math.floor(Math.random() * max), mode, attempts: 0, status: true };

    reply(
      NUMGUESS_LOGO + '\n  𝗡𝘂𝗺𝗯𝗲𝗿 𝗚𝘂𝗲𝘀𝘀𝗶𝗻𝗴 𝗚𝗮𝗺𝗲 𝗦𝘁𝗮𝗿𝘁𝗲𝗱\n\n' +
      `*Mode:* ${mode}\n` +
      `*Range:* 0 – ${max}\n\n` +
      `_I'm thinking of a number… guess it!_`
    );
  } catch (e) { reply('Error: ' + e.message); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CONNECT FOUR GAME
// ══════════════════════════════════════════════════════════════════════════════

const cfgGames = {}; // { [jid]: ConnectFourGame }
const CFG_QUOTES = [
  "Connect Four: Where strategy meets fun!",
  "Let the battle of four-in-a-row begin!",
  "Connect Four: A game of wits and tactics.",
  "Four in a row, that's the way to go!",
  "Every move counts — think before you drop!",
];

class ConnectFourGame {
  constructor() {
    this.player1 = ''; this.player2 = ''; this.currentPlayer = '';
    this.gameStatus = false; this.attempts = {};
    this.matrix = Array.from({ length: 6 }, () => Array(7).fill('⚪'));
  }
  async drop(col) {
    const disc = this.currentPlayer === this.player1 ? '🔵' : '🔴';
    for (let r = 5; r >= 0; r--) {
      if (this.matrix[r][col] === '⚪') { this.matrix[r][col] = disc; return true; }
    }
    return false;
  }
  printMatrix() {
    return this.matrix.map(row => '| ' + row.join(' | ') + ' |').join('\n');
  }
  checkWin() {
    const disc = this.currentPlayer === this.player1 ? '🔵' : '🔴';
    const m = this.matrix;
    for (let r = 0; r < 6; r++)
      for (let c = 0; c <= 3; c++)
        if ([0,1,2,3].every(i => m[r][c+i] === disc)) return true;
    for (let r = 0; r <= 2; r++)
      for (let c = 0; c < 7; c++)
        if ([0,1,2,3].every(i => m[r+i][c] === disc)) return true;
    for (let r = 0; r <= 2; r++)
      for (let c = 0; c <= 3; c++)
        if ([0,1,2,3].every(i => m[r+i][c+i] === disc)) return true;
    for (let r = 0; r <= 2; r++)
      for (let c = 3; c < 7; c++)
        if ([0,1,2,3].every(i => m[r+i][c-i] === disc)) return true;
    return false;
  }
}

cmd({
  pattern:  'cfg',
  desc:     'Start a Connect Four game session',
  category: 'game',
  use:      '<@mention or reply>',
  filename: __filename,
}, async (conn, mek, m, { from, sender, reply }) => {
  try {
    let game = cfgGames[from];
    if (game?.gameStatus) return conn.sendMessage(from, {
      text: `*A game is already in progress!*\nPlayers: @${game.player1.split('@')[0]} vs @${game.player2.split('@')[0]}\nTo end: :delcfg`,
      mentions: [game.player1, game.player2]
    }, { quoted: mek });

    if (!game) { game = new ConnectFourGame(); cfgGames[from] = game; }

    const ctx      = mek.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid?.[0] || (ctx?.participant !== sender ? ctx?.participant : null);
    const opponent  = mentioned && mentioned !== sender ? mentioned : null;

    if (opponent) {
      game.player1 = sender; game.player2 = opponent; game.gameStatus = true;
    } else if (!game.player1 || game.player1 === sender) {
      game.player1 = sender;
      return conn.sendMessage(from, {
        text: `▄▀▀ ▄▀▄ █▄ █ █▄ █ ▄▀▀ ▀█▀\n▀▄▄ ▀▄▀ █ ▀█ █ ▀█ ▀▄▄    █\n   𝗖𝗼𝗻𝗻𝗲𝗰𝘁 𝗙𝗼𝘂𝗿 𝗚𝗮𝗺𝗲 𝗦𝗲𝘀𝘀𝗶𝗼𝗻\n\n*Session Created!*\n_Player 1: @${sender.split('@')[0]} joined_\n_Waiting for another player..._\n\nType :cfg to join.`,
        mentions: [sender]
      }, { quoted: mek });
    } else if (sender !== game.player1) {
      game.player2 = sender; game.gameStatus = true;
    }

    if (game.gameStatus) {
      game.currentPlayer = game.player1;
      game.attempts[game.player1] = 0; game.attempts[game.player2] = 0;
      await conn.sendMessage(from, {
        text: `▄▀▀ ▄▀▄ █▄ █ █▄ █ ▄▀▀ ▀█▀\n▀▄▄ ▀▄▀ █ ▀█ █ ▀█ ▀▄▄    █\n   𝗖𝗼𝗻𝗻𝗲𝗰𝘁 𝗙𝗼𝘂𝗿 𝗚𝗮𝗺𝗲 𝗦𝘁𝗮𝗿𝘁𝗲𝗱\n\n${game.printMatrix()}\n\n` +
          `*Current Turn 🔵:* @${game.player1.split('@')[0]}\n*Next Turn 🔴:* @${game.player2.split('@')[0]}\n\n` +
          `▢ _Enter a column number 1–7_\n\n_"${CFG_QUOTES[Math.floor(Math.random() * CFG_QUOTES.length)]}"_`,
        mentions: [game.player1, game.player2]
      }, { quoted: mek });
    }
  } catch (e) { reply('Error: ' + e.message); }
});

cmd({
  pattern:  'delcfg',
  desc:     'Delete a running Connect Four session',
  category: 'game',
  filename: __filename,
}, async (conn, mek, m, { from, sender, isOwner, reply }) => {
  const game = cfgGames[from];
  if (!game) return reply('*No Connect Four game running in this chat.*');
  if (!isOwner && sender !== game.player1 && sender !== game.player2)
    return reply("*You're not a player of the running game!*");
  delete cfgGames[from];
  reply('*Connect Four session ended.*');
});

// ══════════════════════════════════════════════════════════════════════════════
// CAPITAL CITY QUIZ
// ══════════════════════════════════════════════════════════════════════════════

const CAPITALS = { Afghanistan:"Kabul",Albania:"Tirana",Algeria:"Algiers",Angola:"Luanda",Argentina:"Buenos Aires",Armenia:"Yerevan",Australia:"Canberra",Austria:"Vienna",Azerbaijan:"Baku",Bahamas:"Nassau",Bahrain:"Manama",Bangladesh:"Dhaka",Belarus:"Minsk",Belgium:"Brussels",Bolivia:"Sucre",Brazil:"Brasília",Bulgaria:"Sofia",Cambodia:"Phnom Penh",Cameroon:"Yaoundé",Canada:"Ottawa",Chad:"N'Djamena",Chile:"Santiago",China:"Beijing",Colombia:"Bogotá",Croatia:"Zagreb",Cuba:"Havana",Cyprus:"Nicosia","Czech Republic":"Prague",Denmark:"Copenhagen",Ecuador:"Quito",Egypt:"Cairo",Ethiopia:"Addis Ababa",Finland:"Helsinki",France:"Paris",Germany:"Berlin",Ghana:"Accra",Greece:"Athens",Hungary:"Budapest",Iceland:"Reykjavik",India:"New Delhi",Indonesia:"Jakarta",Iran:"Tehran",Iraq:"Baghdad",Ireland:"Dublin",Israel:"Jerusalem",Italy:"Rome",Jamaica:"Kingston",Japan:"Tokyo",Jordan:"Amman",Kenya:"Nairobi","Korea, South":"Seoul",Kuwait:"Kuwait",Latvia:"Riga",Lebanon:"Beirut",Libya:"Tripoli",Malaysia:"Kuala Lumpur",Mexico:"Mexico City",Morocco:"Rabat",Mozambique:"Maputo",Myanmar:"Naypyidaw",Nepal:"Kathmandu",Netherlands:"Amsterdam","New Zealand":"Wellington",Nigeria:"Abuja",Norway:"Oslo",Pakistan:"Islamabad",Palestine:"Ramallah",Peru:"Lima",Philippines:"Manila",Poland:"Warsaw",Portugal:"Lisbon",Qatar:"Doha",Romania:"Bucharest",Russia:"Moscow",Rwanda:"Kigali","Saudi Arabia":"Riyadh",Senegal:"Dakar",Serbia:"Belgrade",Singapore:"Singapore",Somalia:"Mogadishu","South Africa":"Pretoria","South Sudan":"Juba",Spain:"Madrid","Sri Lanka":"Colombo",Sudan:"Khartoum",Sweden:"Stockholm",Switzerland:"Bern",Syria:"Damascus",Taiwan:"Taipei",Tanzania:"Dodoma",Thailand:"Bangkok",Tunisia:"Tunis",Turkey:"Ankara",Uganda:"Kampala",Ukraine:"Kyiv","United Arab Emirates":"Abu Dhabi","United Kingdom":"London","United States":"Washington",Venezuela:"Caracas",Vietnam:"Hanoi",Yemen:"Sana",Zambia:"Lusaka",Zimbabwe:"Harare" };

const capitalGames = {}; // { [sender]: { id, country, capital, attempts, timer } }

cmd({
  pattern:  'co',
  alias:    ['capital', 'capitalquiz'],
  desc:     'Guess the capital city of a country',
  category: 'game',
  filename: __filename,
}, async (conn, mek, m, { from, sender, reply }) => {
  try {
    if (capitalGames[sender]) return reply('*You already have a game running! Answer it first.*');
    const keys    = Object.keys(CAPITALS);
    const country = keys[Math.floor(Math.random() * keys.length)];
    const capital = CAPITALS[country];

    const game = { id: from, country, capital, attempts: 0, prevText: '', timer: null };
    capitalGames[sender] = game;

    await conn.sendMessage(from, {
      text: `*🌍 Capital City Quiz*\n\n*Player:* @${sender.split('@')[0]}\n*Question:* What is the capital of *${country}*?\n\n_You have 30 seconds to answer!_`,
      mentions: [sender]
    }, { quoted: mek });

    game.timer = setTimeout(async () => {
      if (!capitalGames[sender]) return;
      delete capitalGames[sender];
      await conn.sendMessage(from, {
        text: `*⏰ Time's up, @${sender.split('@')[0]}!*\nThe capital of *${country}* is *${capital}*.`,
        mentions: [sender]
      });
    }, 30000);
  } catch (e) { reply('Error: ' + e.message); }
});

// ══════════════════════════════════════════════════════════════════════════════
// HIDDEN CARD GAME
// ══════════════════════════════════════════════════════════════════════════════

const hcgGames = {}; // { [jid]: HiddenCardGame }

class HiddenCardGame {
  constructor(size = 5) {
    this.size = Math.min(Math.max(size, 3), 7);
    this.total = this.size * this.size;
    this.player1 = ''; this.player2 = ''; this.currentPlayer = '';
    this.gameStatus = false; this.attempts = {};
    this.board = Array(this.total).fill('🈲');
    this.hiddenIdx = -1;
  }
  start(p1, p2) {
    this.player1 = p1; this.player2 = p2;
    this.currentPlayer = p1;
    this.attempts[p1] = 0; this.attempts[p2] = 0;
    this.hiddenIdx = Math.floor(Math.random() * this.total);
    this.gameStatus = true;
  }
  move(player, num) {
    if (player !== this.currentPlayer) return { err: "*It's not your turn!*" };
    const idx = num - 1;
    if (idx < 0 || idx >= this.total || this.board[idx] !== '🈲')
      return { err: `*Invalid move! Enter 1–${this.total}*` };
    this.attempts[player]++;
    if (idx === this.hiddenIdx) {
      this.board[idx] = '🃏'; this.gameStatus = false;
      return { win: true };
    }
    this.board[idx] = '🟦';
    if (!this.board.includes('🈲')) { this.gameStatus = false; return { draw: true }; }
    this.currentPlayer = player === this.player1 ? this.player2 : this.player1;
    return { ok: true };
  }
  display() {
    let out = '';
    for (let r = 0; r < this.size; r++) {
      out += this.board.slice(r * this.size, r * this.size + this.size).join(' ') + '\n';
    }
    return out.trim();
  }
}

cmd({
  pattern:  'hcg',
  desc:     'Start a Hidden Card Game (find the queen card)',
  category: 'game',
  use:      '<@mention> [grid size 3-7]',
  filename: __filename,
}, async (conn, mek, m, { from, sender, args, reply }) => {
  try {
    let game = hcgGames[from];
    if (game?.gameStatus) return reply('*A game is already in progress!*');

    const ctx      = mek.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid?.[0] || (ctx?.participant !== sender ? ctx?.participant : null);
    const opponent  = mentioned && mentioned !== sender ? mentioned : null;
    const size      = parseInt(args[0]) || 5;

    if (!game) { game = new HiddenCardGame(size); hcgGames[from] = game; }

    if (opponent) {
      game.start(sender, opponent);
    } else if (!game.player1 || game.player1 === sender) {
      game.player1 = sender;
      return conn.sendMessage(from, {
        text: `┏━━━━━━━━━━━━━━━━━━┓\n┃   HIDDEN CARD GAME   ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\n*Session Created!*\n_@${sender.split('@')[0]} joined_\n_Waiting for another player..._\n\nType :hcg to join.`,
        mentions: [sender]
      }, { quoted: mek });
    } else if (sender !== game.player1) {
      game.start(game.player1, sender);
    }

    if (game.gameStatus) {
      await conn.sendMessage(from, {
        text: `┏━━━━━━━━━━━━━━━━━━┓\n┃   HIDDEN CARD GAME   ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\n*Game started!*\n_Grid: ${game.size}×${game.size} (${game.total} cells)_\n_Find the hidden queen card 🃏_\n\n${game.display()}\n\n*Current Turn:* @${game.currentPlayer.split('@')[0]}\n_Enter a number 1–${game.total}_`,
        mentions: [game.player1, game.player2]
      }, { quoted: mek });
    }
  } catch (e) { reply('Error: ' + e.message); }
});

cmd({
  pattern:  'delhcg',
  desc:     'Delete a running Hidden Card Game session',
  category: 'game',
  filename: __filename,
}, async (conn, mek, m, { from, sender, isOwner, reply }) => {
  const game = hcgGames[from];
  if (!game) return reply('*No Hidden Card Game running in this chat.*');
  if (!isOwner && sender !== game.player1 && sender !== game.player2)
    return reply("*You're not a player of the running game!*");
  delete hcgGames[from];
  reply('*Hidden Card Game session deleted.*');
});

// ══════════════════════════════════════════════════════════════════════════════
// DICE
// ══════════════════════════════════════════════════════════════════════════════

const DICE_STICKERS = [
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-1.webp',
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-2.webp',
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-3.webp',
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-4.webp',
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-5.webp',
  'https://raw.githubusercontent.com/SuhailTechInfo/Suhail-Md-Media/main/ᴅɪᴄᴇ/sᴜʜᴀɪʟ-ᴍᴅ-ᴅɪᴄᴇ-6.webp',
];

cmd({
  pattern:  'dice',
  desc:     'Roll a dice',
  category: 'game',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    const idx = Math.floor(Math.random() * 6);
    try {
      await conn.sendMessage(from, { sticker: { url: DICE_STICKERS[idx] } }, { quoted: mek });
    } catch {
      // fallback to emoji
      const emojis = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      await conn.sendMessage(from, { text: emojis[idx] }, { quoted: mek });
    }
  } catch (e) { reply('Error: ' + e.message); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GTC — Guess The (Anime) Character
// ══════════════════════════════════════════════════════════════════════════════

const gtcGames = {}; // { [msgId]: { ans, emoji, emojies } }
const GTC_SETS  = [['😺','👻','⏳','🍫'],['🥳','🍂','😎','💀'],['💍','🍁','🔥','💥'],['✨','❄️','⭐','🌚']];

cmd({
  pattern:  'gtc',
  alias:    ['animeguess', 'guessanime'],
  desc:     'Guess the anime character name',
  category: 'game',
  use:      '(no args)',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    const randomChar = require('anime-character-random');
    const char  = await randomChar.GetChar();
    const opts  = [char.OtherCharacterList[0], char.OtherCharacterList[1], char.OtherCharacterList[2], char.CharacterName]
                    .sort(() => Math.random() - 0.5);
    const ansIdx = opts.indexOf(char.CharacterName);
    const emojis = GTC_SETS.map(s => s[Math.floor(Math.random() * s.length)]);

    const text =
      `*[GUESS THE ANIME CHARACTER]*\n\n_React or reply with the correct emoji!_\n\n` +
      opts.map((o, i) => `${emojis[i]}) ${o}`).join('\n') +
      `\n\n_Powered by Queen Kylie_`;

    const sent = await conn.sendMessage(from, { image: { url: char.CharacterImage }, caption: text }, { quoted: mek });
    const msgId = sent?.key?.id;
    if (msgId) {
      gtcGames[msgId] = { ans: char.CharacterName, emoji: emojis[ansIdx], emojies: emojis };
      setTimeout(() => { delete gtcGames[msgId]; }, 5 * 60 * 1000); // expire after 5 min
    }
  } catch (e) { reply('Error: ' + e.message); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TEXT LISTENER — handles all game moves
// Call this from index.js in the message handler:
//   const { handleGameText } = require('./plugins/games');
//   await handleGameText(conn, mek, m, { from, sender, body });
// ══════════════════════════════════════════════════════════════════════════════

async function handleGameText(conn, mek, m, { from, sender, body }) {
  if (!body || mek.key?.fromMe) return;

  // ── Number Guessing ────────────────────────────────────────────────────────
  try {
    const ng = numGuessGames[from];
    if (ng?.status && ng.player === sender) {
      const guess = parseInt(body.trim().split(' ')[0]);
      if (!isNaN(guess)) {
        ng.attempts++;
        if (guess < ng.randomNumber) {
          await conn.sendMessage(from, {
            text: `${NUMGUESS_LOGO}\n  𝗧𝗼𝗼 𝗟𝗼𝘄!\n\n*Attempts:* ${ng.attempts}\n_Try a higher number than ${guess}._`,
          }, { quoted: mek });
        } else if (guess > ng.randomNumber) {
          await conn.sendMessage(from, {
            text: `${NUMGUESS_LOGO}\n  𝗧𝗼𝗼 𝗛𝗶𝗴𝗵!\n\n*Attempts:* ${ng.attempts}\n_Try a lower number than ${guess}._`,
          }, { quoted: mek });
        } else {
          delete numGuessGames[from];
          await conn.sendMessage(from, {
            text: `${NUMGUESS_LOGO}\n  𝗚𝗮𝗺𝗲 𝗙𝗶𝗻𝗶𝘀𝗵𝗲𝗱! 🎉\n\n*Correct! The number was ${ng.randomNumber}*\n*Attempts:* ${ng.attempts}\n*Mode:* ${ng.mode}`,
            mentions: [sender]
          }, { quoted: mek });
        }
      }
    }
  } catch {}

  // ── Connect Four ───────────────────────────────────────────────────────────
  try {
    const cfg = cfgGames[from];
    if (cfg?.gameStatus && cfg.currentPlayer === sender) {
      const col = parseInt(body.trim()) - 1;
      if (!isNaN(col) && col >= 0 && col < 7) {
        const dropped = await cfg.drop(col);
        if (!dropped) {
          return conn.sendMessage(from, { text: `*Column ${col + 1} is full! Choose another.*`, mentions: [sender] }, { quoted: mek });
        }
        cfg.attempts[sender]++;
        const won = cfg.checkWin();
        const board = cfg.printMatrix();
        if (won) {
          const loser = sender === cfg.player1 ? cfg.player2 : cfg.player1;
          delete cfgGames[from];
          return conn.sendMessage(from, {
            text: `▄▀▀ ▄▀▄ █▄ █ █▄ █ ▄▀▀ ▀█▀\n▀▄▄ ▀▄▀ █ ▀█ █ ▀█ ▀▄▄    █\n   𝗚𝗮𝗺𝗲 𝗙𝗶𝗻𝗶𝘀𝗵𝗲𝗱!\n\n${board}\n\n*🏆 Winner:* @${sender.split('@')[0]}\n*💀 Loser:* @${loser.split('@')[0]}\n_Congratulations!_`,
            mentions: [sender, loser]
          }, { quoted: mek });
        }
        cfg.currentPlayer = sender === cfg.player1 ? cfg.player2 : cfg.player1;
        await conn.sendMessage(from, {
          text: `▄▀▀ ▄▀▄ █▄ █ █▄ █ ▄▀▀ ▀█▀\n▀▄▄ ▀▄▀ █ ▀█ █ ▀█ ▀▄▄    █\n   𝗖𝗼𝗻𝗻𝗲𝗰𝘁 𝗙𝗼𝘂𝗿 𝗕𝗼𝗮𝗿𝗱\n\n${board}\n\n` +
            `*Current Turn ${cfg.currentPlayer === cfg.player1 ? '🔵' : '🔴'}:* @${cfg.currentPlayer.split('@')[0]}\n_Enter column 1–7_`,
          mentions: [cfg.player1, cfg.player2]
        }, { quoted: mek });
      }
    }
  } catch {}

  // ── Capital Quiz ───────────────────────────────────────────────────────────
  try {
    const cg = capitalGames[sender];
    if (cg && cg.id === from && body.trim() !== cg.prevText) {
      cg.prevText = body.trim();
      cg.attempts++;
      clearTimeout(cg.timer);
      if (body.trim().toLowerCase() === cg.capital.toLowerCase()) {
        delete capitalGames[sender];
        await conn.sendMessage(from, {
          text: `*✅ Correct, @${sender.split('@')[0]}!*\n_The capital of *${cg.country}* is *${cg.capital}*._\n*Attempts:* ${cg.attempts}`,
          mentions: [sender]
        }, { quoted: mek });
      } else if (cg.attempts >= 3) {
        delete capitalGames[sender];
        await conn.sendMessage(from, {
          text: `*❌ Game Over, @${sender.split('@')[0]}!*\n_Too many wrong answers._\nThe capital of *${cg.country}* is *${cg.capital}*.`,
          mentions: [sender]
        }, { quoted: mek });
      } else {
        await conn.sendMessage(from, {
          text: `*Wrong! @${sender.split('@')[0]}*\n_${3 - cg.attempts} attempt(s) left. You have 30s._`,
          mentions: [sender]
        }, { quoted: mek });
        cg.timer = setTimeout(async () => {
          if (!capitalGames[sender]) return;
          delete capitalGames[sender];
          await conn.sendMessage(from, {
            text: `*⏰ Time's up, @${sender.split('@')[0]}!*\nThe capital of *${cg.country}* is *${cg.capital}*.`,
            mentions: [sender]
          });
        }, 30000);
      }
    }
  } catch {}

  // ── Hidden Card Game ───────────────────────────────────────────────────────
  try {
    const hcg = hcgGames[from];
    if (hcg?.gameStatus && hcg.currentPlayer === sender) {
      const num = parseInt(body.trim());
      if (!isNaN(num)) {
        const result = hcg.move(sender, num);
        if (result.err) return conn.sendMessage(from, { text: result.err }, { quoted: mek });
        if (result.win) {
          const loser = sender === hcg.player1 ? hcg.player2 : hcg.player1;
          delete hcgGames[from];
          return conn.sendMessage(from, {
            text: `┏━━━━━━━━━━━━━━━━━━┓\n┃   𝗤𝗨𝗘𝗘𝗡 𝗖𝗔𝗥𝗗 𝗙𝗢𝗨𝗡𝗗!   ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\n${hcg.display()}\n\n*🏆 Winner:* @${sender.split('@')[0]}\n*💀 Loser:* @${loser.split('@')[0]}\n_Found in ${hcg.attempts[sender]} attempt(s)!_`,
            mentions: [sender, loser]
          }, { quoted: mek });
        }
        if (result.draw) {
          delete hcgGames[from];
          return conn.sendMessage(from, { text: `*Game Over — hidden card not found!*\n${hcg.display()}` }, { quoted: mek });
        }
        await conn.sendMessage(from, {
          text: `┏━━━━━━━━━━━━━━━━━━┓\n┃   HIDDEN CARD GAME   ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\n${hcg.display()}\n\n*Current Turn:* @${hcg.currentPlayer.split('@')[0]}\n_Enter 1–${hcg.total}_`,
          mentions: [hcg.player1, hcg.player2]
        }, { quoted: mek });
      }
    }
  } catch {}

  // ── GTC reaction/reply check ───────────────────────────────────────────────
  try {
    const reactionKey = mek.message?.reactionMessage?.key?.id;
    const replyKey    = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const msgId       = reactionKey || replyKey;
    const game        = msgId ? gtcGames[msgId] : null;
    if (game && body) {
      if (body === game.emoji) {
        delete gtcGames[msgId];
        await conn.sendMessage(from, {
          text: `*🎉 Correct, @${sender.split('@')[0]}!*\n_The character was: ${game.emoji}) ${game.ans}_`,
          mentions: [sender]
        }, { quoted: mek });
      } else if (game.emojies.includes(body)) {
        if (!game[sender]) game[sender] = 0;
        game[sender]++;
        if (game[sender] >= 2) {
          delete gtcGames[msgId];
          await conn.sendMessage(from, {
            text: `*❌ You lose, @${sender.split('@')[0]}!*\nThe answer was: ${game.emoji}) ${game.ans}`,
            mentions: [sender]
          }, { quoted: mek });
        } else {
          await conn.sendMessage(from, {
            text: `*Wrong! @${sender.split('@')[0]}*\n_One more chance!_`,
            mentions: [sender]
          }, { quoted: mek });
        }
      }
    }
  } catch {}
}

module.exports = { handleGameText };