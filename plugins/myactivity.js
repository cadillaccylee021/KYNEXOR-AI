// plugins/myactivity.js — Show user's activity stats for today
'use strict';
const { cmd }      = require('../command');
const { getStats } = require('../lib/groupstats');

cmd({
  pattern: 'myactivity',
  alias: ['mystats', 'mymsgs', 'rank'],
  desc: "Check your message activity stats for today",
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, sender, isGroup, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  try {
    const stats = getStats(from);
    if (!stats || !stats.users?.[sender])
      return reply("📊 You haven't sent any messages today yet!");

    const userCount  = stats.users[sender];
    const total      = stats.total;
    const pct        = ((userCount / total) * 100).toFixed(1);
    const sorted     = Object.entries(stats.users).sort((a, b) => b[1] - a[1]);
    const rank       = sorted.findIndex(([id]) => id === sender) + 1;

    await conn.sendMessage(from, {
      text: `📊 *Your Activity Today*\n\n👤 *User:* @${sender.split('@')[0]}\n📝 *Messages:* ${userCount}\n📈 *Share:* ${pct}%\n🏆 *Rank:* #${rank} of ${sorted.length}\n\nKeep chatting! 💬`,
      mentions: [sender]
    }, { quoted: mek });
  } catch (e) {
    console.error('myactivity error:', e);
    reply('❌ Error loading activity stats.');
  }
});
