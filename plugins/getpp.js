// plugins/getpp.js — Get profile picture
'use strict';
const axios  = require('axios');
const { cmd } = require('../command');

cmd({
  pattern: 'getpp',
  alias: ['gp', 'getpic'],
  desc: 'Get profile picture of a user',
  category: 'user',
  filename: __filename,
}, async (conn, mek, m, { from, sender, reply }) => {
  try {
    let target = sender;
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    if (ctx?.quotedMessage) target = ctx.participant;
    else if (ctx?.mentionedJid?.length) target = ctx.mentionedJid[0];

    try {
      const ppUrl = await conn.profilePictureUrl(target, 'image');
      if (!ppUrl) return reply('❌ No profile picture found.');
      const res = await axios.get(ppUrl, { responseType: 'arraybuffer' });
      await conn.sendMessage(from, {
        image: Buffer.from(res.data),
        caption: `👤 Profile picture of @${target.split('@')[0]}`,
        mentions: [target]
      }, { quoted: mek });
    } catch {
      reply('❌ Profile picture not found or is private.');
    }
  } catch (e) {
    reply('❌ Could not fetch profile picture.');
  }
});
