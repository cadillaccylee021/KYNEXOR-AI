'use strict';
const { cmd } = require('../command');
const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const config = require('../config');

// Tenor v2 API — get a free key at https://developers.google.com/tenor/guides/quickstart
// Falls back to a public demo key if TENOR_KEY is not set in config
const TENOR_KEY = config.TENOR_KEY || 'AIzaSyAyimkuYQYF_FXVALexPzR6wyC8oCxrAHw';

cmd({
  pattern: 'stickersearch',
  alias: ['sticsearch'],
  desc: 'Search Tenor for animated stickers',
  category: 'search',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(`*Provide a search term!*\nExample: ${config.PREFIX || '/'}stickersearch happy`);

    // Use Tenor v2 (v1 is deprecated)
    const res = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: {
        q,
        key: TENOR_KEY,
        limit: 8,
        media_filter: 'mp4,gif'
      }
    }).catch(() => null);

    const results = res?.data?.results;
    if (!results?.length) return reply('*Could not find any stickers!*');

    const count = Math.min(results.length, 5);
    await conn.sendMessage(from, { text: `🔍 Sending *${count}* sticker(s) for "*${q}*"...` }, { quoted: mek });

    for (let i = 0; i < count; i++) {
      try {
        // Try mp4 first, fall back to gif
        const media = results[i]?.media_formats;
        const url   = media?.mp4?.url || media?.gif?.url;
        if (!url) continue;

        const buf = await axios.get(url, { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data));
        const sticker = new Sticker(buf, {
          pack:    config.BOT_NAME  || 'QUEEN_KYLIE',
          author:  config.OWNER_NAME || 'Bot',
          type:    StickerTypes.FULL,
          quality: 70
        });
        const stickerBuf = await sticker.toBuffer();
        await conn.sendMessage(from, { sticker: stickerBuf }, { quoted: mek });
      } catch {}
    }
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
