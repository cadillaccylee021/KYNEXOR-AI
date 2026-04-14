// plugins/whatsapp.js — chat management + privacy settings
// NOTE: clear/archive/pin/mute use chatModify which requires app state sync.
//       If your session lacks those keys, re-scan your QR to get a fresh session.
//       markread uses readMessages (no app state needed).
'use strict';

const { cmd } = require('../command');

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

cmd({
  pattern:  'clear',
  fromMe:   true,
  desc:     'Delete a WhatsApp chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({
      delete: true,
      lastMessages: [{ key: mek.key, messageTimestamp: mek.messageTimestamp }]
    }, from);
    reply('_Cleared!_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code to get a new session with full app state sync.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'archive',
  fromMe:   true,
  desc:     'Archive a WhatsApp chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({
      archive: true,
      lastMessages: [{ message: mek.message, key: mek.key, messageTimestamp: mek.messageTimestamp }]
    }, from);
    reply('_Archived_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'unarchive',
  fromMe:   true,
  desc:     'Unarchive a WhatsApp chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({
      archive: false,
      lastMessages: [{ message: mek.message, key: mek.key, messageTimestamp: mek.messageTimestamp }]
    }, from);
    reply('_Unarchived_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'chatpin',
  alias:    ['pinchat'],
  fromMe:   true,
  desc:     'Pin a chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({ pin: true }, from);
    reply('_Pinned_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'unpin',
  alias:    ['unpinchat', 'chatunpin'],
  fromMe:   true,
  desc:     'Unpin a chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({ pin: false }, from);
    reply('_Unpinned_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

// markread uses readMessages — does NOT need app state keys ✅
cmd({
  pattern:  'markread',
  fromMe:   true,
  desc:     'Mark chat as read',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.readMessages([mek.key]);
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
  } catch (e) { reply('Error: ' + e.message); }
});

// markunread still needs chatModify — flag clearly
cmd({
  pattern:  'markunread',
  fromMe:   true,
  desc:     'Mark chat as unread',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({ markRead: false, lastMessages: [mek] }, from);
    await conn.sendMessage(from, { react: { text: '🍁', key: mek.key } });
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'unmutechat',
  fromMe:   true,
  desc:     'Unmute a chat',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.chatModify({ mute: null }, from);
    reply('_Chat Unmuted!_');
  } catch (e) {
    if (e.message?.includes('App state key')) {
      return reply('❌ *This command requires a fresh bot session.*\nPlease re-scan your QR code.');
    }
    reply('Error: ' + e.message);
  }
});

cmd({
  pattern:  'profilename',
  fromMe:   true,
  desc:     'Change your WhatsApp profile name',
  category: 'whatsapp',
  use:      '<new name>',
  filename: __filename,
}, async (conn, mek, m, { q, reply }) => {
  try {
    const name = q ? q.trim() : '';
    if (!name) return reply('*Need a name!*\n*Example:* :profilename Your Name');
    await conn.updateProfileName(name);
    reply('_Profile name updated!_');
  } catch (e) { reply('Error: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY SETTINGS — all use dedicated update methods, NOT chatModify ✅
// ─────────────────────────────────────────────────────────────────────────────

cmd({
  pattern:  'getprivacy',
  fromMe:   true,
  desc:     'Get your WhatsApp privacy settings',
  category: 'whatsapp',
  filename: __filename,
}, async (conn, mek, m, { sender, pushname, from, reply }) => {
  try {
    const {
      readreceipts, profile, status, online, last, groupadd, calladd
    } = await conn.fetchPrivacySettings(true);

    const msg =
      `*♺ WhatsApp Privacy Settings*\n\n` +
      `*ᝄ Name:* ${pushname || 'Unknown'}\n` +
      `*ᝄ Number:* ${sender.split('@')[0]}\n\n` +
      `*ᝄ Online:* ${online}\n` +
      `*ᝄ Profile:* ${profile}\n` +
      `*ᝄ Last Seen:* ${last}\n` +
      `*ᝄ Status:* ${status}\n` +
      `*ᝄ Read Receipts:* ${readreceipts}\n\n` +
      `*ᝄ Who can add to groups:* ${groupadd}\n` +
      `*ᝄ Who can call:* ${calladd}`;

    try {
      const pp = await conn.profilePictureUrl(sender, 'image');
      await conn.sendMessage(from, { image: { url: pp }, caption: msg }, { quoted: mek });
    } catch {
      reply(msg);
    }
  } catch (e) { reply('Error: ' + e.message); }
});

function privacyCmd({ pattern, desc, options, fn }) {
  cmd({
    pattern,
    fromMe:   true,
    desc,
    category: 'whatsapp',
    use:      `<${options.join(' | ')}>`,
    filename: __filename,
  }, async (conn, mek, m, { q, reply }) => {
    try {
      const val = q ? q.trim().toLowerCase() : '';
      if (!val) return reply(`_*Example:* :${pattern} ${options[0]}_\n_Options: *${options.join(' / ')}*_`);
      if (!options.includes(val)) return reply(`_Must be one of: *${options.join(' / ')}*_`);
      await fn(conn, val);
      reply(`_Privacy updated to *${val}*_ ✅`);
    } catch (e) { reply('Error: ' + e.message); }
  });
}

const FULL   = ['all', 'contacts', 'contact_blacklist', 'none'];
const ONLINE = ['all', 'match_last_seen'];
const READ   = ['all', 'none'];

privacyCmd({ pattern: 'lastseen', desc: 'Change last seen privacy',      options: FULL,   fn: (c, v) => c.updateLastSeenPrivacy(v)          });
privacyCmd({ pattern: 'online',   desc: 'Change online privacy',         options: ONLINE, fn: (c, v) => c.updateOnlinePrivacy(v)             });
privacyCmd({ pattern: 'mypp',     desc: 'Change profile picture privacy', options: FULL,  fn: (c, v) => c.updateProfilePicturePrivacy(v)    });
privacyCmd({ pattern: 'mystatus', desc: 'Change status privacy',         options: FULL,   fn: (c, v) => c.updateStatusPrivacy(v)             });
privacyCmd({ pattern: 'read',     desc: 'Change read receipts privacy',  options: READ,   fn: (c, v) => c.updateReadReceiptsPrivacy(v)       });
privacyCmd({ pattern: 'groupadd', desc: 'Change group add privacy',      options: FULL,   fn: (c, v) => c.updateGroupsAddPrivacy(v)          });
