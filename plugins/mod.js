// plugins/mod.js — Per-group moderation: badwords, warnings, blacklist, welcome/goodbye
// All data stored in unified SQLite via lib/botdb.js

'use strict';

const { cmd } = require('../command');
const botdb   = require('../lib/botdb');
const config  = require('../config');

// ── Text helpers ─────────────────────────────────────────────────────────────
function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function extractMessageText(mek) {
  try {
    if (mek?.message?.conversation)                  return mek.message.conversation;
    if (mek?.message?.extendedTextMessage?.text)     return mek.message.extendedTextMessage.text;
    if (mek?.message?.imageMessage?.caption)         return mek.message.imageMessage.caption;
    if (mek?.message?.videoMessage?.caption)         return mek.message.videoMessage.caption;
    return '';
  } catch (e) { return ''; }
}
function matchBadword(badwords, text) {
  if (!text || !badwords.length) return null;
  const plain = normalizeText(text);
  for (const w of badwords) {
    const needle = normalizeText(w);
    if (!needle) continue;
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${esc}\\b`, 'i').test(plain) || plain.includes(needle)) return w;
  }
  return null;
}

// ── Delete helper ─────────────────────────────────────────────────────────────
async function tryDelete(conn, mek) {
  try { await conn.sendMessage(mek.key.remoteJid, { delete: mek.key }); return true; }
  catch { return false; }
}

// ── Profile pic helper ───────────────────────────────────────────────────────
async function getDP(conn, jid) {
  try { return await conn.profilePictureUrl(jid, 'image'); }
  catch { return 'https://files.catbox.moe/49gzva.png'; }
}

// ============================================================================
// BADWORD COMMANDS  (group admin or owner only)
// ============================================================================

cmd({
  pattern: 'addbadword',
  desc: 'Add a bad word for this group (or global with :addbadword global <word>)',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, q, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const raw = (q || args.join(' ')).trim();
  if (!raw) return reply('Usage: addbadword <word>  or  addbadword global <word>');

  let scope = from;   // per-group by default
  let word  = raw;
  if (raw.startsWith('global ') && isOwner) {
    scope = '*';
    word  = raw.slice(7).trim();
  }

  word = normalizeText(word).split(' ')[0]; // single word
  if (word.length < 2) return reply('Word too short (min 2 chars).');

  botdb.addBadword(scope, word);
  return reply(`✅ Bad word added${scope === '*' ? ' *(global)*' : ''}: *${word}*`);
});

cmd({
  pattern: 'removebadword',
  alias: ['deletebadword'],
  desc: 'Remove a bad word from this group',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, q, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const word = normalizeText((q || args.join(' ')).trim()).split(' ')[0];
  if (!word) return reply('Usage: removebadword <word>');
  const removed = botdb.removeBadword(from, word);
  return reply(removed ? `✅ Removed: *${word}*` : `❌ *${word}* not found in bad-word list.`);
});

cmd({
  pattern: 'badwords',
  alias: ['listbadwords'],
  desc: 'List bad words active in this group',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  
  const rows = botdb.listBadwords(from) || [];
  if (!rows.length) return reply('No bad words set for this group.');
  
  const global = rows.filter(r => r.group_jid === '*').map(r => r.word);
  const local  = rows.filter(r => r.group_jid === from).map(r => r.word); 
  
  let out = '*Bad Words List*\n';
  if (local.length)  out += `\n*Group:* ${local.join(', ')}`;
  if (global.length) out += `\n*Global:* ${global.join(', ')}`;
  return reply(out.trim());
});

// ── Badword action setting ───────────────────────────────────────────────────
cmd({
  pattern: 'setbadwordaction',
  desc: 'Set action for bad words: delete | warn | kick | ban | reply | none',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const opt = (args[0] || '').toLowerCase();
  const allowed = ['delete', 'warn', 'kick', 'ban', 'reply', 'none'];
  if (!allowed.includes(opt)) return reply(`Options: ${allowed.join(' | ')}`);
  botdb.setGroupSetting(from, 'badword_action', opt);
  return reply(`✅ Bad word action set to *${opt}* for this group.`);
});

// ── Warn limit setting ───────────────────────────────────────────────────────
cmd({
  pattern: 'setwarnlimit',
  desc: 'Set warning limit before action (e.g. setwarnlimit 3)',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const n = parseInt(args[0]);
  if (isNaN(n) || n < 1 || n > 20) return reply('Enter a number between 1 and 20.');
  botdb.setGroupSetting(from, 'warn_limit', n);
  return reply(`✅ Warn limit set to *${n}* for this group.`);
});

// ── On-warn-limit action ─────────────────────────────────────────────────────
cmd({
  pattern: 'setwarnaction',
  desc: 'Action when warn limit is reached: kick | ban | none',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const opt = (args[0] || '').toLowerCase();
  if (!['kick', 'ban', 'none'].includes(opt)) return reply('Options: kick | ban | none');
  botdb.setGroupSetting(from, 'on_warn_limit', opt);
  return reply(`✅ On-warn-limit action set to *${opt}* for this group.`);
});

// ============================================================================
// WARNING COMMANDS  (group only)
// ============================================================================

cmd({
  pattern: 'warn',
  desc: 'Warn a group member (mention or reply)',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');

  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender);
  if (!target) return reply('Tag a user or reply to their message.');

  const settings = botdb.getGroupSettings(from) || {};
  const count    = botdb.incrementWarning(from, target);
  const limit    = settings.warn_limit || 3;
  const warnAction = settings.on_warn_limit || 'kick';

  if (count >= limit) {
    if (warnAction === 'kick') {
      // Blindly attempt kick; if bot lacks permissions, the catch swallows the error
      await conn.groupParticipantsUpdate(from, [target], 'remove').catch(() => {});
      await conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} removed — reached ${count}/${limit} warnings.`, mentions: [target] });
      botdb.resetWarning(from, target);
    } else if (warnAction === 'ban') {
      botdb.addToBlacklist(target, 'warn limit reached');
      await conn.sendMessage(from, { text: `🚫 @${target.split('@')[0]} blacklisted — reached ${count}/${limit} warnings.`, mentions: [target] });
      botdb.resetWarning(from, target);
    } else {
      await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} has reached max warnings (${count}/${limit}).`, mentions: [target] });
      botdb.resetWarning(from, target);
    }
  } else {
    await conn.sendMessage(from, {
      text: `⚠️ @${target.split('@')[0]} — Warning *${count}/${limit}*`,
      mentions: [target]
    });
  }
});

cmd({
  pattern: 'resetwarn',
  alias: ['clearwarn'],
  desc: 'Reset warnings for a member',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender);
  if (!target) return reply('Tag a user or reply to reset their warnings.');
  botdb.resetWarning(from, target);
  return reply(`✅ Warnings cleared for @${target.split('@')[0]}`, { mentions: [target] });
});

cmd({
  pattern: 'warnings',
  alias: ['warnlist'],
  desc: 'Show warnings for this group',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');
  const rows = botdb.listWarnings(from);
  if (!rows.length) return reply('No warnings recorded for this group. 🎉');
  const lines = rows.map(r => `@${r.user_jid.split('@')[0]} — *${r.count}* warn(s)`);
  return reply(`*Warnings in this group:*\n${lines.join('\n')}`);
});

// ============================================================================
// BLACKLIST COMMANDS
// ============================================================================

cmd({
  pattern: 'blacklist',
  alias: ['bl'],
  desc: 'Add user to global blacklist (mention or reply)',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender);
  if (!target) return reply('Tag a user or reply to blacklist them.');
  botdb.addToBlacklist(target, 'manual');
  return reply(`🚫 @${target.split('@')[0]} blacklisted.`, { mentions: [target] });
});

cmd({
  pattern: 'unblacklist',
  alias: ['ubl'],
  desc: 'Remove user from blacklist',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { from, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender);
  if (!target) return reply('Tag a user or reply.');
  botdb.removeFromBlacklist(target);
  return reply(`✅ @${target.split('@')[0]} removed from blacklist.`, { mentions: [target] });
});

cmd({
  pattern: 'blacklisted',
  desc: 'Show global blacklist',
  category: 'moderation',
  filename: __filename,
}, async (conn, mek, m, { reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  const rows = botdb.getBlacklist();
  if (!rows.length) return reply('Blacklist is empty. ✅');
  const lines = rows.map(r => `• @${r.user_jid.split('@')[0]}${r.reason ? ` (${r.reason})` : ''}`);
  return reply(`*Blacklisted Users (${rows.length}):*\n${lines.join('\n')}`);
});

// ============================================================================
// WELCOME / GOODBYE  (per-group, group admin only)
// ============================================================================

cmd({
  pattern: 'welcome',
  desc: 'welcome on | off | <custom message>',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, q, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');

  const settings = botdb.getGreetings(from) || {};
  if (!args.length) {
    return reply(settings.welcome_enabled
      ? `Welcome: *ON*\nMessage: ${settings.welcome_msg || '(default)'}`
      : 'Welcome: *OFF*');
  }

  const opt = args[0].toLowerCase();
  const DEFAULT = "Welcome @{user} to {group}! We're glad to have you 🎉";
  if (opt === 'on') {
    botdb.setWelcome(from, true, settings.welcome_msg || DEFAULT);
    return reply('✅ Welcome messages *enabled*.');
  }
  if (opt === 'off') {
    botdb.setWelcome(from, false, settings.welcome_msg || '');
    return reply('✅ Welcome messages *disabled*.');
  }
  // custom message
  const custom = q || args.join(' ');
  botdb.setWelcome(from, true, custom);
  return reply(`✅ Welcome message set:\n${custom}`);
});

cmd({
  pattern: 'goodbye',
  alias: ['bye'],
  desc: 'goodbye on | off | <custom message>',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, q, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');

  const settings = botdb.getGreetings(from) || {};
  if (!args.length) {
    return reply(settings.goodbye_enabled
      ? `Goodbye: *ON*\nMessage: ${settings.goodbye_msg || '(default)'}`
      : 'Goodbye: *OFF*');
  }

  const opt = args[0].toLowerCase();
  const DEFAULT = "Goodbye @{user} from {group}. We'll miss you! 👋";
  if (opt === 'on') {
    botdb.setGoodbye(from, true, settings.goodbye_msg || DEFAULT);
    return reply('✅ Goodbye messages *enabled*.');
  }
  if (opt === 'off') {
    botdb.setGoodbye(from, false, settings.goodbye_msg || '');
    return reply('✅ Goodbye messages *disabled*.');
  }
  const custom = q || args.join(' ');
  botdb.setGoodbye(from, true, custom);
  return reply(`✅ Goodbye message set:\n${custom}`);
});

// ============================================================================
// GROUP PARTICIPANTS EVENT (welcome/goodbye auto-trigger)
// ============================================================================

function handleGroupParticipantsUpdate(conn, update) {
  const { id: groupId, action, participants } = update;
  if (!groupId || !participants || !participants.length) return;
  if (!['add', 'remove'].includes(action)) return;

  // Use Greetings module (which reads from botdb)
  try {
    const Greetings = require('../lib/Greetings');
    Greetings({ id: groupId, action, participants }, conn).catch(e =>
      console.error('Greetings handler error:', e)
    );
  } catch (e) {
    console.error('Greetings require error:', e);
  }
}

// ============================================================================
// BADWORD ENFORCEMENT  (group-only, called from index.js per-message)
// ============================================================================

/**
 * enforceBadwords — must only be called for group messages.
 * Returns { handled: boolean, reason?: string }
 */
async function enforceBadwords(conn, mek, m, opts = {}) {
  try {
    const chatId = mek.key?.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return { handled: false };

    // 1. Strictly filter out other groups' words to prevent bleeding
    const badwordsRows = botdb.listBadwords(chatId) || [];
    const badwords = badwordsRows
      .filter(r => r.group_jid === chatId || r.group_jid === '*')
      .map(r => r.word);

    if (!badwords.length) return { handled: false };

    const text = extractMessageText(mek) || m?.text || m?.body || '';
    if (!text) return { handled: false };

    const matched = matchBadword(badwords, text);
    if (!matched) return { handled: false };

    // Exempt owners and admins
    if (opts.isOwner || opts.isAdmins) return { handled: false };

    const senderId = mek.key?.participant || m?.sender;
    if (!senderId) return { handled: false };

    // 2. Add fallback to prevent silent crashes if settings are undefined
    const settings = botdb.getGroupSettings(chatId) || {};
    const action   = settings.badword_action || 'warn';

    async function del() { await tryDelete(conn, mek); }

    if (action === 'none') return { handled: false };

    if (action === 'delete') {
      await del();
      return { handled: true, reason: 'deleted' };
    }

    if (action === 'reply') {
      await del();
      await conn.sendMessage(chatId, {
        text: `⚠️ @${senderId.split('@')[0]} — Bad language not allowed here.`,
        mentions: [senderId]
      }, { quoted: mek }).catch(() => {});
      return { handled: true, reason: 'replied' };
    }

    if (action === 'kick') {
      await conn.groupParticipantsUpdate(chatId, [senderId], 'remove').catch(() => {});
      await conn.sendMessage(chatId, {
        text: `👢 @${senderId.split('@')[0]} removed for using banned words.`,
        mentions: [senderId]
      }).catch(() => {});
      return { handled: true, reason: 'kicked' };
    }

    if (action === 'ban') {
      botdb.addToBlacklist(senderId, 'badword');
      await del();
      await conn.sendMessage(chatId, {
        text: `🚫 @${senderId.split('@')[0]} blacklisted for bad language.`,
        mentions: [senderId]
      }).catch(() => {});
      return { handled: true, reason: 'banned' };
    }

    // 3. Default: warn logic with properly enforced limits
    if (settings.delete_on_warn) await del();
    const count = botdb.incrementWarning(chatId, senderId);
    const limit = settings.warn_limit || 3;
    const warnAction = settings.on_warn_limit || 'kick';

    if (count >= limit) {
      if (warnAction === 'kick') {
        await conn.groupParticipantsUpdate(chatId, [senderId], 'remove').catch(() => {});
        await conn.sendMessage(chatId, {
          text: `👢 @${senderId.split('@')[0]} removed — reached ${count}/${limit} warnings.`,
          mentions: [senderId]
        }).catch(() => {});
        botdb.resetWarning(chatId, senderId);
      } else if (warnAction === 'ban') {
        botdb.addToBlacklist(senderId, 'warn limit');
        await conn.sendMessage(chatId, {
          text: `🚫 @${senderId.split('@')[0]} blacklisted — reached ${count}/${limit} warnings.`,
          mentions: [senderId]
        }).catch(() => {});
        botdb.resetWarning(chatId, senderId);
      } else {
        await conn.sendMessage(chatId, {
          text: `⚠️ @${senderId.split('@')[0]} — Reached max warnings (${count}/${limit}).`,
          mentions: [senderId]
        }).catch(() => {});
        botdb.resetWarning(chatId, senderId);
      }
      return { handled: true, reason: 'warn_limit_reached' };
    }

    await conn.sendMessage(chatId, {
      text: `⚠️ @${senderId.split('@')[0]} — Warning *${count}/${limit}*`,
      mentions: [senderId]
    }).catch(() => {});
    return { handled: true, reason: 'warned' };

  } catch (err) {
    console.error('enforceBadwords error:', err);
    return { handled: false };
  }
}

module.exports = { enforceBadwords, handleGroupParticipantsUpdate };
