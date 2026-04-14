'use strict';
const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

const validEndpoints = [
  'poke','hug','hold','hifi','bite','blush','punch','pat',
  'kiss','kill','happy','dance','yeet','wink','slap','bonk',
  'bully','cringe','cuddle'
];

cmd({
  pattern: 'react',
  alias: ['reaction'],
  desc: 'Send a reaction GIF. Usage: /react hug',
  category: 'reaction',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const term = (q || '').toLowerCase().trim();
    if (!term || !validEndpoints.includes(term)) {
      return reply(`*Please provide a valid reaction type:*\n\n${validEndpoints.join(', ')}\n\n*Example:* /react hug`);
    }
    const res = await axios.get(`https://api.waifu.pics/sfw/${term}`).catch(() => null);
    if (!res?.data?.url) return reply('*Could not find any gif*');
    await conn.sendMessage(from, {
      video: { url: res.data.url },
      caption: `_${config.BOT_NAME || 'QUEEN_KYLIE'}_`,
      gifPlayback: true
    }, { quoted: mek });
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
