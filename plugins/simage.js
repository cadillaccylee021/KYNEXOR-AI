// plugins/simage.js — Convert sticker to image or video
'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd }       = require('../command');
const { webp2png, webp2mp4 } = require('../lib/webp2mp4');

cmd({
  pattern: 'simage',
  alias: ['toimg', 'sticker2img', 'svideo'],
  desc: 'Convert sticker to image (static) or video (animated)',
  category: 'sticker',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return reply('📎 Reply to a sticker to convert it.');

    const target = { key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
    if (!target.message?.stickerMessage) return reply('📎 Reply to a *sticker* to convert it.');

    const buf = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });
    if (!buf) return reply('❌ Failed to download sticker.');

    const isAnimated = target.message.stickerMessage.isAnimated;

    if (isAnimated) {
      const mp4 = await webp2mp4(buf);
      await conn.sendMessage(from, { video: mp4, mimetype: 'video/mp4', gifPlayback: true }, { quoted: mek });
    } else {
      const img = await webp2png(buf);
      await conn.sendMessage(from, { image: img }, { quoted: mek });
    }
  } catch (e) {
    console.error('simage error:', e);
    reply(`❌ Failed to convert sticker: ${e.message}`);
  }
});
