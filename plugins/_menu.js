'use strict';
// plugins/menu.js
const os   = require('os');
const fs   = require('fs');
const path = require('path');

const Config          = require('../config');
const { cmd, commands } = require('../command');

// ── Safe lib imports ──────────────────────────────────────────────────
let fancytext, runtime, formatp;
try {
  const lib = require('../lib');
  fancytext = typeof lib.fancytext === 'function' ? lib.fancytext : null;
  runtime   = typeof lib.runtime   === 'function' ? lib.runtime   : null;
  formatp   = lib.formatp || lib.formatBytes || null;
} catch (_) {}

// ── Helpers ───────────────────────────────────────────────────────────
function formatUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (runtime) { try { return runtime(secs); } catch (_) {} }
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes) {
  if (formatp) { try { return formatp(bytes); } catch (_) {} }
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function formatLabel(cat) {
  if (fancytext) { try { const r = fancytext(cat, 1); if (r) return r; } catch (_) {} }
  return String(cat).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCmd(p) {
  if (fancytext) { try { const r = fancytext(p, 1); if (r) return r; } catch (_) {} }
  return String(p);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryLoadThumb() {
  try {
    const p = path.join(process.cwd(), 'media/thumb.jpg');
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch (_) {}
  return null;
}

// Readmore spacer
const READMORE = '\u200e'.repeat(4001);

// ── Command ───────────────────────────────────────────────────────────
cmd({
  pattern:  'menu',
  alias:    ['help', 'list'],
  desc:     'Show all bot commands',
  category: 'main',
  filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
  try {
    // Loading message
    await conn.sendMessage(from, {
      text: '👑 *Kynexor is gathering commands* 🩵🧸'
    }, { quoted: mek });
    await sleep(800);

    // ── Time & greeting ───────────────────────────────────────────────
    const TZ  = Config.TIMEZONE || 'Africa/Johannesburg';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB',  { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ });
    const dateStr = now.toLocaleDateString('en-GB',  { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
    const hour    = parseInt(now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }), 10) || now.getHours();

    let greeting;
    if (hour >= 5  && hour < 12) greeting = "Good Mornin' 👑🩵🧸";
    else if (hour >= 12 && hour < 18) greeting = "Good Afternoon 👑🩵🧸";
    else if (hour >= 18 && hour < 22) greeting = "Good Evenin' 👑🩵🧸";
    else greeting = "Go Sleep, it's late 👑🩵🧸";

    // ── Bot info ──────────────────────────────────────────────────────
    const BOT_NAME   = Config.BOT_NAME   || 'QUEEN KYLIE V1';
    const OWNER_NAME = Config.OWNER_NAME || 'Owner';
    const PREFIX     = Config.PREFIX     || '/';
    const ram        = formatBytes(os.totalmem() - os.freemem());
    const uptime     = formatUptime(process.uptime());
    const totalCmds  = (commands || []).filter(c => c.pattern && !c.dontAddCommandList).length;

    // ── Build categories ──────────────────────────────────────────────
    const cats = {};
    (commands || []).forEach(c => {
      if (!c || c.dontAddCommandList || !c.pattern) return;
      const cat = (c.category || 'misc').toLowerCase();
      if (!cats[cat]) cats[cat] = [];
      const pat = typeof c.pattern === 'string' ? c.pattern : '[cmd]';
      cats[cat].push(pat);
    });

    // ── Assemble menu text ────────────────────────────────────────────
    let text = '';
    text += `┏━⟪🩵👑 *${BOT_NAME}* 👑🩵⟫━߷\n`;
    text += `┃ 👑 *OWNER:* ${OWNER_NAME}\n`;
    text += `┃ ⌚ *UPTIME:* ${uptime}\n`;
    text += `┃ 🩵 *RAM:* ${ram}\n`;
    text += `┃ 📅 *DATE:* ${dateStr} | ${timeStr}\n`;
    text += `┃ 🔧 *PREFIX:* ${PREFIX}\n`;
    text += `┃ 🧸 *COMMANDS:* ${totalCmds}\n`;
    text += `┃ ${greeting}\n\n`;

    const sortedCats = Object.keys(cats).sort();
    for (const cat of sortedCats) {
      text += `┏━━👑 *${formatLabel(cat)}* 👑━━߷\n`;
      cats[cat].forEach(p => {
        text += `┃   🧸 ${formatCmd(p)}\n`;
      });
      text += '\n';
    }

    text += `┗━━━━━━━━━━━━━━߷👸\n`;
    text += `\n𝗠𝗔𝗗𝗘 𝗪𝗜𝗧𝗛 𝗟𝗢𝗩𝗘, *${BOT_NAME}*!\n`;
    text += `©𝘴𝘪𝘳𝘤𝘺𝘭𝘦𝘦\n`;
    text += READMORE;

    // ── Send ──────────────────────────────────────────────────────────
    const thumb = await tryLoadThumb();

    if (thumb) {
      await conn.sendMessage(from, {
        image:   thumb,
        caption: text
      }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { text }, { quoted: mek });
    }

  } catch (err) {
    console.error('[menu] error:', err.message);
    try { await reply('❌ Error generating menu: ' + err.message); } catch (_) {}
  }
});
