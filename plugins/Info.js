// plugins/info.js — channel, support, test, usage
'use strict';
const { cmd } = require('../command');
const config  = require('../config');

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL — Post channel link
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'channel',
  alias: ['chalink', 'followus'],
  desc: 'Get the WhatsApp channel link',
  category: 'info',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await conn.sendMessage(from, {
    text:
      `👑 *${config.BOT_NAME || 'Queen Kylie'} — CHANNEL SUPPORT*\n\n` +
      `_ʜᴇʏ ʜᴇʀᴇ's ᴏᴜʀ ᴄʜᴀɴɴᴇʟ ʟɪɴᴋ, ᴘʟᴇᴀsᴇ ғᴏʟʟᴏᴡ ᴀɴᴅ sᴜᴘᴘᴏʀᴛ ᴜs ᴛᴏ ᴋᴇᴇᴘ ᴛʜɪs ᴘʀᴏᴊᴇᴄᴛ ᴀʟɪᴠᴇ_\n\n` +
      `*🔗 Link:* https://whatsapp.com/channel/0029VavkrOID38CSgcyfbM07\n\n` +
      `_${config.BOT_NAME || 'Queen Kylie'} © cylee_`,
    contextInfo: { forwardingScore: 999, isForwarded: true }
  }, { quoted: mek });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT — Post repo/support link
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'support',
  alias: ['repo', 'source'],
  desc: 'Get the bot support and repo link',
  category: 'info',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await conn.sendMessage(from, {
    text:
      `🛠️ *${config.BOT_NAME || 'Queen Kylie'} — SUPPORT & REPO*\n\n` +
      `*GitHub Repo:* https://github.com/sircylee/Queen_Kylie-V1\n\n` +
      `_${config.BOT_NAME || 'Queen Kylie'} Works ✅_`,
    contextInfo: { forwardingScore: 999, isForwarded: true }
  }, { quoted: mek });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST — Check bot is alive
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'test',
  alias: ['check', 'checkbot', 'alive'],
  desc: 'Check if bot is active',
  category: 'info',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
  await conn.sendMessage(from, {
    text: `*${config.BOT_NAME || 'QUEEN_KYLIE'} IS CURRENTLY ACTIVE!* 👸❤️\n\n⏱️ Uptime: ${formatUptime(process.uptime())}`
  }, { quoted: mek });
});

function formatUptime(sec) {
  const d = Math.floor(sec/86400), h = Math.floor((sec%86400)/3600),
        m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  return [d&&`${d}d`, h&&`${h}h`, m&&`${m}m`, `${s}s`].filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE — Show command usage history since bot started
// Call trackUsage(senderJid, commandName) from index.js to populate
// In index.js, inside the "if (cmdData)" block add:
//   const { trackUsage } = require('./plugins/info');
//   trackUsage(sender, command);
// ─────────────────────────────────────────────────────────────────────────────
const { trackUsage, getUsageHistory } = require('../lib/usageTracker');

cmd({
  pattern: 'usage',
  alias: ['cmdusage', 'cmdused', 'commandstats'],
  desc: 'Show command usage stats since last restart',
  category: 'info',
  filename: __filename,
}, async (conn, mek, m, { from, isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  const usageHistory = getUsageHistory();
  if (!usageHistory.length) return reply('_No commands have been used yet since last restart._');

  // Aggregate per user
  const map = {};
  for (const { sender, command } of usageHistory) {
    if (!map[sender]) map[sender] = { count: 0, commands: {} };
    map[sender].count++;
    map[sender].commands[command] = (map[sender].commands[command] || 0) + 1;
  }

  const users = Object.keys(map);
  const lines = users.map((jid, i) => {
    const num    = jid.split('@')[0];
    const cmds   = Object.entries(map[jid].commands)
      .map(([c, n]) => `${c}${n > 1 ? ` (${n})` : ''}`)
      .join(', ');
    return `*${i+1}. @${num}* ➪ ${map[jid].count} uses\n   _${cmds}_`;
  }).join('\n\n');

  await conn.sendMessage(from, {
    text:
      `📊 *COMMAND USAGE SINCE LAST RESTART*\n\n` +
      `*Total Users:* ${users.length}\n` +
      `*Total Commands Used:* ${usageHistory.length}\n\n` +
      lines,
    mentions: users
  }, { quoted: mek });
});

