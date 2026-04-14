'use strict';
const { cmd } = require('../command');
const config = require('../config');

cmd({
  pattern: 'live',
  react: '⏰',
  desc: 'Show current live time and date',
  category: 'fun',
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const tz = config.TIMEZONE || 'Africa/Johannesburg';
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('en-ZA', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const hours = now.getHours();
    let wish = '🌙 Good Night';
    if (hours >= 5 && hours < 12) wish = '⛅ Good Morning';
    else if (hours >= 12 && hours < 17) wish = '🌞 Good Afternoon';
    else if (hours >= 17 && hours < 21) wish = '🌥️ Good Evening';

    const msg = `╭────────────────╮
│  *${wish}* 
│  ⏰ *Time:* ${time}
│  📅 *Date:* ${date}
│  🌍 *Zone:* ${tz}
╰────────────────╯`;
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
