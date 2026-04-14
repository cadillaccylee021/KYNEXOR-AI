// plugins/crop.js — Crop image/video/sticker to square sticker
'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const webp   = require('node-webpmux');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd }    = require('../command');
const config     = require('../config');
const { getTempDir, deleteTempFile } = require('../lib/tempManager');

cmd({
  pattern: 'crop',
  alias: ['square', 'cropper'],
  desc: 'Crop sticker/image/video to a perfect square sticker',
  category: 'sticker',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  const tmpDir     = getTempDir();
  const tempInput  = path.join(tmpDir, `crop_in_${Date.now()}`);
  const tempOutput = path.join(tmpDir, `crop_out_${Date.now()}.webp`);

  try {
    // Resolve target message (direct or quoted)
    let targetMessage = mek;
    const ctxInfo = mek.message?.extendedTextMessage?.contextInfo;
    if (ctxInfo?.quotedMessage) {
      targetMessage = { key: { remoteJid: from, id: ctxInfo.stanzaId, participant: ctxInfo.participant }, message: ctxInfo.quotedMessage };
    }

    const msgTypes = ['imageMessage', 'stickerMessage', 'videoMessage', 'documentMessage'];
    const msgType  = msgTypes.find(t => targetMessage.message?.[t]);
    if (!msgType) return reply('✂️ Reply to a *sticker*, *image*, or *video* to crop it.');

    const mediaMsg  = targetMessage.message[msgType];
    const mediaBuf  = await downloadMediaMessage(targetMessage, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });
    if (!mediaBuf) return reply('❌ Failed to download media.');
    if (mediaBuf.length > 50 * 1024 * 1024) return reply('❌ File too large (max 50MB).');

    fs.writeFileSync(tempInput, mediaBuf);

    const isAnimated = mediaMsg.mimetype?.includes('gif') || mediaMsg.mimetype?.includes('video') || (mediaMsg.seconds || 0) > 0 || msgType === 'videoMessage';
    const isLarge    = mediaBuf.length > 5 * 1024 * 1024;

    let cmd;
    if (isAnimated) {
      cmd = isLarge
        ? `ffmpeg -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k "${tempOutput}"`
        : `ffmpeg -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k "${tempOutput}"`;
    } else {
      cmd = `ffmpeg -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
    }

    await new Promise((res, rej) => exec(cmd, e => e ? rej(e) : res()));

    let webpBuffer = fs.readFileSync(tempOutput);
    const img = new webp.Image();
    await img.load(webpBuffer);

    const json       = { 'sticker-pack-id': crypto.randomBytes(32).toString('hex'), 'sticker-pack-name': config.BOT_NAME || 'Queen Kylie V1', emojis: ['✂️'] };
    const exifAttr   = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif       = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;

    const final = await img.save(null);
    await conn.sendMessage(from, { sticker: final }, { quoted: mek });
  } catch (e) {
    console.error('crop error:', e);
    reply('❌ Failed to crop. Try with an image or video.');
  } finally {
    deleteTempFile(tempInput);
    deleteTempFile(tempOutput);
  }
});
