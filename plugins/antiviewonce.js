// plugins/antiviewonce.js — antiviewonce command + viewonce message listener
// Hook: call registerAntiViewOnce(conn) in both index files on connection open
'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const botdb = require('../lib/botdb');

// ── botdb helpers (reuse group_settings table with a special key) ──────────
const KEY = 'antiviewonce';

function isEnabled(botNumber) {
  try {
    return botdb.getGroupSetting(KEY + '_' + botNumber, KEY) === 'true';
  } catch (e) { return false; }
}
function setEnabled(botNumber, val) {
  try {
    botdb.setGroupSetting(KEY + '_' + botNumber, KEY, val ? 'true' : 'false');
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTIVIEWONCE command — owner only
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'antiviewonce',
  alias: ['antivv', 'avv'],
  desc: 'Turn on/off auto ViewOnce downloader',
  category: 'owner',
  use: '<on/off>',
  filename: __filename,
}, async (conn, mek, m, { from, q, botNumber, isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');

  const arg = q ? q.toLowerCase().trim() : '';
  const cur = isEnabled(botNumber);

  if (!arg) {
    return reply(`*AntiViewOnce is currently ${cur ? 'ON ✅' : 'OFF ❌'}*\nUse :antiviewonce on/off`);
  }

  if (['on', 'enable', 'act'].includes(arg)) {
    if (cur) return reply('*AntiViewOnce is already enabled 👸❤️🧸*');
    setEnabled(botNumber, true);
    return reply('*✅ AntiViewOnce successfully enabled 👸❤️🧸*');
  }

  if (['off', 'disable', 'deact'].includes(arg)) {
    if (!cur) return reply('*AntiViewOnce is already disabled 👸❤️🧸*');
    setEnabled(botNumber, false);
    return reply('*✅ AntiViewOnce successfully disabled 👸❤️🧸*');
  }

  reply('*Use on/off to enable/disable AntiViewOnce!*');
});

// ─────────────────────────────────────────────────────────────────────────────
// registerAntiViewOnce — hook into messages.upsert to catch viewonce messages
// Call this in both index files inside the connection open handler
// ─────────────────────────────────────────────────────────────────────────────
function registerAntiViewOnce(conn) {
  conn.ev.on('messages.upsert', async ({ messages }) => {
    for (const mek of messages) {
      try {
        if (!mek.message) continue;

        const botNumber = conn.user?.id?.split(':')[0];
        if (!isEnabled(botNumber)) continue;

        // Detect viewonce message types
        const vvTypes = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
        const vvKey   = vvTypes.find(t => mek.message[t]);
        if (!vvKey) continue;

        // Don't process bot's own messages
        if (mek.key?.fromMe) continue;

        const innerMsg = mek.message[vvKey]?.message || mek.message[vvKey];
        const mediaKey = ['imageMessage', 'videoMessage', 'audioMessage'].find(t => innerMsg?.[t]);
        if (!mediaKey) continue;

        const sender   = mek.key.participant || mek.key.remoteJid || 'Unknown';
        const chatId   = mek.key.remoteJid;
        const ownerJid = botNumber + '@s.whatsapp.net';

        // Download the viewonce media
        const buffer = await downloadMediaMessage(
          { key: mek.key, message: { [mediaKey]: innerMsg[mediaKey] } },
          'buffer', {},
          { logger: undefined, reuploadRequest: conn.updateMediaMessage }
        );

        const mType    = mediaKey.replace('Message', '');
        const caption  =
          `*[VIEWONCE FOUND 👀 100% DOWNLOADED]*\n\n` +
          `*Sender:* @${sender.split('@')[0]}\n` +
          `*Chat:* ${chatId}\n` +
          `*Time:* ${new Date().toLocaleTimeString()}`;

        await conn.sendMessage(ownerJid, {
          [mType]: buffer,
          caption,
          mimetype: innerMsg[mediaKey]?.mimetype,
          mentions: [sender]
        });

      } catch (e) {
        console.error('antiviewonce listener error:', e.message);
      }
    }
  });
  console.log('✅ AntiViewOnce listener registered');
}

module.exports = { registerAntiViewOnce };
