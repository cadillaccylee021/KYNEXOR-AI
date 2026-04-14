'use strict';
const { cmd } = require('../command');
const config = require('../config');

const P = config.PREFIX || '/';

// ── pp ────────────────────────────────────────────────────────────────
cmd({
  pattern: 'pp',
  desc: 'Set your profile picture',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    if (!m.quoted && !mek.message?.imageMessage) {
      return reply('*Reply to an image to set it as your profile picture!*');
    }
    let buf;
    if (m.quoted) {
      try { buf = await m.quoted.getbuff; } catch {}
      if (!buf) try { buf = await m.quoted.download(); } catch {}
    }
    if (!buf && mek.message?.imageMessage) {
      try { buf = await m.download(); } catch {}
    }
    if (!buf) return reply('*Could not download the image.*');
    await conn.updateProfilePicture(conn.user.id, buf);
    reply('✅ *Profile picture updated!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── rpp ───────────────────────────────────────────────────────────────
cmd({
  pattern: 'rpp',
  desc: 'Remove your profile picture',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    await conn.removeProfilePicture(conn.user.id);
    reply('✅ *Profile picture removed!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── setbio ────────────────────────────────────────────────────────────
cmd({
  pattern: 'setbio',
  alias: ['setabout'],
  desc: 'Update your WhatsApp status/bio',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!q) return reply(`*Example:* ${P}setbio I am a bot!`);
    await conn.updateProfileStatus(q);
    reply(`✅ *Bio updated to:* ${q}`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── blocklist ─────────────────────────────────────────────────────────
cmd({
  pattern: 'blocklist',
  desc: 'Get list of all blocked numbers',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const list = await conn.fetchBlocklist();
    if (!list?.length) return reply('*No blocked numbers found.*');
    let txt = `🚫 *Blocked Numbers (${list.length})*\n\n`;
    list.forEach((n, i) => { txt += `${i + 1}. wa.me/${n.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── location ──────────────────────────────────────────────────────────
cmd({
  pattern: 'location',
  desc: 'Send a GPS location by coordinates',
  category: 'whatsapp',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(`*Example:* ${P}location -26.2041,28.0473`);
    const [lat, lon] = q.split(',').map(parseFloat);
    if (isNaN(lat) || isNaN(lon)) return reply('*Invalid format.*\nExample: /location -26.2041,28.0473');
    await conn.sendMessage(from, {
      location: { degreesLatitude: lat, degreesLongitude: lon }
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── vcard ─────────────────────────────────────────────────────────────
cmd({
  pattern: 'vcard',
  desc: 'Create a contact card for a replied user',
  category: 'whatsapp',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!m.quoted?.sender) return reply('*Reply to a user\'s message first!*');
    if (!q) return reply(`*Example:* ${P}vcard John Doe`);
    const num = m.quoted.sender.split('@')[0];
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${q}\nORG:;\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;
    await conn.sendMessage(from, {
      contacts: { displayName: q, contacts: [{ vcard }] }
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── forward ───────────────────────────────────────────────────────────
cmd({
  pattern: 'forward',
  alias: ['send'],
  desc: 'Forward a replied message to a number or JID',
  category: 'whatsapp',
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!m.quoted) return reply('*Reply to a message to forward!*');
    if (!q) return reply(`*Provide a number or JID!*\nExample: ${P}forward 2348012345678`);
    const jid = q.includes('@') ? q.trim() : `${q.replace(/\D/g, '')}@s.whatsapp.net`;
    await conn.sendMessage(jid, m.quoted.message || {});
    reply(`✅ *Forwarded to ${jid.split('@')[0]}!*`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── block ─────────────────────────────────────────────────────────────
cmd({
  pattern: 'block2',
  alias: ['blockuser'],
  desc: 'Block a user (reply to their message)',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
  try {
    const target = m.quoted?.sender || (!isGroup ? from : null);
    if (!target?.includes('@s.whatsapp.net')) return reply('*Reply to a user to block!*');
    await conn.updateBlockStatus(target, 'block');
    reply(`✅ *@${target.split('@')[0]} blocked!*`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── unblock ───────────────────────────────────────────────────────────
cmd({
  pattern: 'unblock2',
  alias: ['unblockuser'],
  desc: 'Unblock a user (reply to their message)',
  category: 'whatsapp',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
  try {
    const target = m.quoted?.sender || (!isGroup ? from : null);
    if (!target?.includes('@s.whatsapp.net')) return reply('*Reply to a user to unblock!*');
    await conn.updateBlockStatus(target, 'unblock');
    reply(`✅ *@${target.split('@')[0]} unblocked!*`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── editmsg ───────────────────────────────────────────────────────────
cmd({
  pattern: 'editmsg',
  fromMe: true,
  desc: 'Edit a message the bot sent',
  category: 'whatsapp',
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!m.quoted?.fromMe) return reply('*Reply to a message sent by the bot!*');
    if (!q) return reply('*Provide the new text!*');
    await conn.sendMessage(mek.key.remoteJid, { text: q, edit: m.quoted.fakeObj?.key || m.quoted.key });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── slog ──────────────────────────────────────────────────────────────
cmd({
  pattern: 'slog',
  desc: 'Save a message to your own number as a log',
  category: 'whatsapp',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    if (!m.quoted) return reply('*Reply to a message to save it!*');
    const botNum = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    await conn.sendMessage(botNum, m.quoted.message || {});
    reply('✅ *Message saved to your log!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
