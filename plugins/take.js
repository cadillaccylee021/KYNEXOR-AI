// plugins/take.js — Steal a sticker and re-pack with custom packname
'use strict';
const crypto = require('crypto');
const webp   = require('node-webpmux');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd }    = require('../command');
const config     = require('../config');

cmd({
  pattern: 'take',
  alias: ['steal'],
  desc: 'Steal a sticker and change its packname',
  category: 'sticker',
  filename: __filename,
}, async (conn, mek, m, { from, sender, args, reply }) => {
  try {
    let target = mek;
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    if (ctx?.quotedMessage) {
      target = { key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
    }

    if (!target.message?.stickerMessage) return reply('🎭 Reply to a *sticker* with :take to steal it.');

    const buf = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });
    if (!buf) return reply('❌ Failed to download sticker.');

    const packname   = args.length ? args.join(' ') : (mek.pushName || sender.split('@')[0]);
    const img        = new webp.Image();
    await img.load(buf);

    const json       = { 'sticker-pack-id': crypto.randomBytes(32).toString('hex'), 'sticker-pack-name': packname, emojis: ['🤖'] };
    const exifAttr   = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuf    = Buffer.from(JSON.stringify(json), 'utf8');
    const exif       = Buffer.concat([exifAttr, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);
    img.exif = exif;

    await conn.sendMessage(from, { sticker: await img.save(null) }, { quoted: mek });
  } catch (e) {
    console.error('take error:', e);
    reply('❌ Failed to steal sticker.');
  }
});
