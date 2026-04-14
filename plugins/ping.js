'use strict';
const { cmd } = require('../command');

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

cmd({
  pattern:  'ping',
  react:    '⚡',
  desc:     'Check the bot latency and uptime',
  category: 'misc',
  filename: __filename
}, async (conn, mek, m, { from }) => {
  try {
    const uptime = formatUptime(process.uptime());

    // Send initial message and measure round-trip time
    const start    = Date.now();
    const sent     = await conn.sendMessage(from, { text: '⏱️ Pinging...' }, { quoted: mek });
    const latency  = Date.now() - start;

    // Edit that same message with the final result
    await conn.sendMessage(from, {
      text:
        `🤖 *Pong!*\n\n` +
        `⚡ *Latency:* ${latency}ms\n` +
        `⏱️ *Uptime:* ${uptime}\n\n` +
        `== |👸| *Powered by Kylie* |👸| ==`,
      edit: sent.key
    });

  } catch (e) {
    console.error('[ping] error:', e.message);
  }
});
