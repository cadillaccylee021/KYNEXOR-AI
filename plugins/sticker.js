// plugins/sticker.js — Convert image/video to WhatsApp sticker (auto-compression)
'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { exec }  = require('child_process');
const webp      = require('node-webpmux');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd }    = require('../command');
const config     = require('../config');
const { getTempDir, deleteTempFile } = require('../lib/tempManager');

cmd({
  pattern: 'sticker',
  alias: ['s', 'stiker', 'stc'],
  desc: 'Convert image or video to sticker',
  category: 'sticker',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  let tempFiles = [];
  try {
    let target = mek;
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    if (ctx?.quotedMessage) {
      target = { key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
    }

    const mediaMsg = target.message?.imageMessage || target.message?.videoMessage || target.message?.documentMessage;
    if (!mediaMsg) return reply('📎 Reply to an *image* or *video* with :sticker, or send media with :sticker as caption.');

    const buf = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });
    if (!buf) return reply('❌ Failed to download media.');
    if (buf.length > 50 * 1024 * 1024) return reply('❌ File too large (max 50MB).');

    const dir   = getTempDir();
    const ts    = Date.now();
    const inp   = path.join(dir, `stk_in_${ts}`);
    const outp  = path.join(dir, `stk_out_${ts}.webp`);
    tempFiles   = [inp, outp];

    fs.writeFileSync(inp, buf);

    const isAnim = mediaMsg.mimetype?.includes('gif') || mediaMsg.mimetype?.includes('video') || (mediaMsg.seconds || 0) > 0;
    const baseCmd = isAnim
      ? `"${ffmpegPath}" -i "${inp}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${outp}"`
      : `"${ffmpegPath}" -i "${inp}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${outp}"`;

    const run = cmd => new Promise((res, rej) => exec(cmd, e => e ? rej(e) : res()));
    await run(baseCmd);

    let webpBuf = fs.readFileSync(outp);

    // Fallback compression if animated sticker is too large
    if (isAnim && webpBuf.length > 1000 * 1024) {
      const outp2 = path.join(dir, `stk_fb_${ts}.webp`);
      tempFiles.push(outp2);
      const isLarge = buf.length > 5 * 1024 * 1024;
      const fbCmd = isLarge
        ? `"${ffmpegPath}" -y -i "${inp}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k "${outp2}"`
        : `"${ffmpegPath}" -y -i "${inp}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k "${outp2}"`;
      await run(fbCmd);
      if (fs.existsSync(outp2)) webpBuf = fs.readFileSync(outp2);
    }

    // Add EXIF metadata
    const img = new webp.Image();
    await img.load(webpBuf);
    const json       = { 'sticker-pack-id': crypto.randomBytes(32).toString('hex'), 'sticker-pack-name': config.BOT_NAME || 'Queen Kylie V1', emojis: ['🤖'] };
    const exifAttr   = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuf    = Buffer.from(JSON.stringify(json), 'utf8');
    const exif       = Buffer.concat([exifAttr, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);
    img.exif = exif;

    await conn.sendMessage(from, { sticker: await img.save(null) }, { quoted: mek });
  } catch (e) {
    console.error('sticker error:', e);
    reply('❌ Failed to create sticker.');
  } finally {
    tempFiles.forEach(deleteTempFile);
  }
});


// ── Ported from old bot ──
cmd({
    pattern: "round",
    alias: ["r"],
    desc: "Change image to round sticker.",
    category: "sticker",
    use: ".roundsticker <Reply to image>",
    filename: __filename
}, async (conn, mek, m, { from, reply, isCmd, command, args, q, isGroup, pushname }) => {
    try {
        const isQuotedImage = m.quoted && (m.quoted.type === 'imageMessage' || (m.quoted.type === 'viewOnceMessage' && m.quoted.msg.type === 'imageMessage'));
        const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';

        if ((m.type === 'imageMessage') || isQuotedImage) {
            const nameJpg = getRandom('.jpg');
            const imageBuffer = isQuotedImage ? await m.quoted.download() : await m.download();
            await fs.promises.writeFile(nameJpg, imageBuffer);

            let sticker = new Sticker(nameJpg, {
                pack: global.botname, // Use global.botname for the sticker pack
                author: global.devsname || 'Hacker Only_🥇Empire', // Use global.devsname for the author
                type: StickerTypes.ROUND, // Round sticker type
                categories: ['🤩', '🎉'], // Sticker categories
                id: '12345', // Sticker id
                quality: 75, // Quality of the sticker
                background: 'transparent', // Transparent background for round stickers
            });

            const buffer = await sticker.toBuffer();
            return conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
        } else if (isQuotedSticker) {
            const nameWebp = getRandom('.webp');
            const stickerBuffer = await m.quoted.download();
            await fs.promises.writeFile(nameWebp, stickerBuffer);

            let sticker = new Sticker(nameWebp, {
                pack: global.botname, // Use global.botname for the sticker pack
                author: global.devsname || 'Hacker Only_🥇Empire', // Use global.devsname for the author
                type: StickerTypes.ROUND, // Round sticker type
                categories: ['🤩', '🎉'], // Sticker categories
                id: '12345', // Sticker id
                quality: 75, // Quality of the sticker
                background: 'transparent', // Transparent background for round stickers
            });

            const buffer = await sticker.toBuffer();
            return conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
        } else {
            return await reply(imgmsg); // Return the default message if no image or sticker is found.
        }
    } catch (e) {
        reply('Error !!');
        console.error(e);
    }
});

cmd({
    pattern: "crop",
    alias: ["c"],
    desc: "Change image to cropped sticker.",
    category: "sticker",
    use: ".cropsticker <Reply to image>",
    filename: __filename
}, async (conn, mek, m, { from, reply, isCmd, command, args, q, isGroup, pushname }) => {
    try {
        const isQuotedImage = m.quoted && (m.quoted.type === 'imageMessage' || (m.quoted.type === 'viewOnceMessage' && m.quoted.msg.type === 'imageMessage'));
        const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';

        if ((m.type === 'imageMessage') || isQuotedImage) {
            const nameJpg = getRandom('.jpg');
            const imageBuffer = isQuotedImage ? await m.quoted.download() : await m.download();
            await fs.promises.writeFile(nameJpg, imageBuffer);

            let sticker = new Sticker(nameJpg, {
                pack: global.botname, // Use global.botname for the sticker pack
                author: global.devsname || 'Hacker Only_🥇Empire', // Use global.devsname for the author
                type: StickerTypes.CROPPED, // CROP sticker type
                categories: ['🤩', '🎉'], // Sticker categories
                id: '12345', // Sticker id
                quality: 75, // Quality of the sticker
                background: 'transparent', // Transparent background for cropped stickers
            });

            const buffer = await sticker.toBuffer();
            return conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
        } else if (isQuotedSticker) {
            const nameWebp = getRandom('.webp');
            const stickerBuffer = await m.quoted.download();
            await fs.promises.writeFile(nameWebp, stickerBuffer);

            let sticker = new Sticker(nameWebp, {
                pack: global.botname, // Use global.botname for the sticker pack
                author: global.devsname || 'Hacker Only_🥇Empire', // Use global.devsname for the author
                type: StickerTypes.CROPPED, // CROP sticker type
                categories: ['🤩', '🎉'], // Sticker categories
                id: '12345', // Sticker id
                quality: 75, // Quality of the sticker
                background: 'transparent', // Transparent background for cropped stickers
            });

            const buffer = await sticker.toBuffer();
            return conn.sendMessage(from, { sticker: buffer }, { quoted: mek });
        } else {
            return await reply(imgmsg); // Return the default message if no image or sticker is found.
        }
    } catch (e) {
        reply('Error !!');
        console.error(e);
    }
});