// plugins/alive.js — alive, about, dev
'use strict';
const { cmd } = require('../command');
const config  = require('../config');

function runtime(sec) {
  const d = Math.floor(sec/86400), h = Math.floor((sec%86400)/3600),
        m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALIVE
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'alive',
  react: '🌄',
  desc: "Check bot's status and latency",
  category: 'misc',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  const start = Date.now();
  await new Promise(r => setTimeout(r, 100));
  const latency = Date.now() - start;

  await reply(
`👸 *Queen_Kylie is Alive, calm down ❤️🧸*

*Latency:* ${latency}ms
*Speed:* Fast as always, always on point 👸❤️🧸
*Uptime:* ${runtime(process.uptime())}

*Channel:* https://whatsapp.com/channel/0029VavkrOID38CSgcyfbM07

*=== |👸| Powered by Kylie |👸| ===*`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'about',
  alias: ['abbt', 'botinfo'],
  react: '👸',
  desc: 'Shows info about the bot',
  category: 'misc',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await reply(
`👸 *Queen_Kylie*

*Owner:* Cylee
*Uptime:* ${runtime(process.uptime())}

*Channel:* https://whatsapp.com/channel/0029VavkrOID38CSgcyfbM07
*Repository:* https://github.com/sircylee/Queen_Kylie-V1
*WhatsApp Group:* https://chat.whatsapp.com/JXoY2bM3swm4tt234IpCga

*Made With Love by cylee ❤️*
*LONG LIVE THE QUEEN 👸*

*=== |👸| Powered by Kylie |👸| ===*`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DEV
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'dev',
  alias: ['developer', 'owner'],
  react: '🧠',
  desc: 'Info about the developer',
  category: 'misc',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await reply(
`🧠 *Developer Info*

*Name:* cylee ❤️
*Age:* 17
*Occupation:* Writer
*Hobby:* Poetry
*Contact:* https://wa.me/27615045572

*=== |👸| Powered by Kylie |👸| ===*`
  );
});
