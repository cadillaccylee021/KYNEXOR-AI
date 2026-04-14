// plugins/settings.js
const { cmd } = require('../command');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const config = require('../config');

const BADWORDS_PATH = path.join(process.cwd(), './lib/badwords.json');
const BLACKLIST_PATH = path.join(process.cwd(), './lib/blacklist.json');
const SYSTEM_PATH = path.join(process.cwd(), './lib/systemSettings.json');
const WARN_PATH = path.join(process.cwd(), './lib/warnings.json');

async function loadJson(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw || 'null') ?? fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveJson(filePath, obj) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function normalizeJid(raw) {
  if (!raw) return null;
  raw = String(raw).trim();
  if (raw.includes('@')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return digits + '@s.whatsapp.net';
}
function normalizeText(text='') {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}
function extractMessageText(mek) {
  try {
    if (mek?.message?.conversation) return mek.message.conversation;
    if (mek?.message?.extendedTextMessage?.text) return mek.message.extendedTextMessage.text;
    if (mek?.message?.imageMessage?.caption) return mek.message.imageMessage.caption;
    if (mek?.message?.videoMessage?.caption) return mek.message.videoMessage.caption;
    return '';
  } catch (e) { return ''; }
}

async function ensureSystemDefaults() {
  const sys = await loadJson(SYSTEM_PATH, {});
  sys.settings = sys.settings || {};
  if (typeof sys.settings.badwordAction === 'undefined') sys.settings.badwordAction = 'warn';
  if (typeof sys.settings.deleteOnWarn === 'undefined') sys.settings.deleteOnWarn = true;
  if (typeof sys.settings.warnLimit === 'undefined') sys.settings.warnLimit = 3;
  if (typeof sys.settings.onWarnLimit === 'undefined') sys.settings.onWarnLimit = 'kick'; // kick|ban|none
  sys.welcome = sys.welcome || { enabledChats: {} };
  sys.goodbye = sys.goodbye || { enabledChats: {} };
  await saveJson(SYSTEM_PATH, sys);
  return sys;
}

async function incrementWarningForChat(chatId, sender) {
  const sys = await ensureSystemDefaults();
  const db = await loadJson(WARN_PATH, {});
  db.chats = db.chats || {};
  db.chats[chatId] = db.chats[chatId] || {};
  db.chats[chatId].warnings = db.chats[chatId].warnings || {};
  db.chats[chatId].warnLimit = db.chats[chatId].warnLimit || sys.settings.warnLimit || 3;

  const current = db.chats[chatId].warnings[sender] || 0;
  const now = current + 1;
  db.chats[chatId].warnings[sender] = now;
  await saveJson(WARN_PATH, db);
  return { now, warnLimit: db.chats[chatId].warnLimit, sys };
}

/* -----------------------
   HELPERS: admin check, dp fetch
----------------------- */

async function isMemberAdmin(conn, chatId, userJid) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return false;
    // fetch group metadata (best-effort)
    let meta = null;
    if (typeof conn.groupMetadata === 'function') {
      meta = await conn.groupMetadata(chatId).catch(()=>null);
    }
    if (!meta || !Array.isArray(meta.participants)) return false;
    const p = meta.participants.find(x => String(x.id || x.jid || x).split(':')[0] === String(userJid).split(':')[0]);
    if (!p) return false;
    // Baileys participant admin field may vary
    const adminFlags = p.admin || p.isAdmin || p.role || p.admin === 'admin';
    // if adminFlags is truthy (string or boolean) consider admin
    return !!adminFlags;
  } catch (e) {
    return false;
  }
}

async function getProfilePictureUrlSafe(conn, jid) {
  try {
    if (typeof conn.profilePictureUrl === 'function') {
      const url = await conn.profilePictureUrl(jid).catch(()=>null);
      if (url) return url;
    }
  } catch(e){}
  // fallback placeholder (transparent)
  return 'https://i.ibb.co/2s3YQ1q/no-profile.png';
}

/* -----------------------
   BADWORDS: add/delete/set action + enforcement
----------------------- 

cmd({
  pattern: 'addbadword',
  desc: 'Add a word to badword filter',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { args, q, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  if (!q && (!args || args.length === 0)) return reply('Usage: addbadword <word> (or reply to offending message and run command)');

  let word = (q || args.join(' ')).trim().toLowerCase();
  word = word.replace(/[^\p{L}\p{N}\s]/gu, '');

  if (word.split(' ').length > 2) return reply('Only one or two words allowed.');
  if (word.length < 3) return reply('Word too short.');

  let bad = await loadJson(BADWORDS_PATH, []);
  if (!Array.isArray(bad)) bad = [];

  if (bad.includes(word)) return reply('That badword already exists.');

  bad.push(word);
  await saveJson(BADWORDS_PATH, bad);

  // immediate enforcement if replying to offending message (best-effort)
  try {
    if (m.quoted && m.quoted.key) {
      const quotedKey = m.quoted.key;
      const quotedText = (m.quoted.text || m.quoted.body || extractMessageText(m.quoted)) || '';
      const normQuoted = normalizeText(quotedText);
      if (normQuoted && (normQuoted.includes(normalizeText(word)) || new RegExp(`\\b${normalizeText(word)}\\b`, 'i').test(normQuoted))) {
        try { await conn.sendMessage(m.chat, { delete: quotedKey }).catch(()=>{}); } catch(e){}
      }
    }
  } catch (e) {
    console.error('addbadword immediate enforcement error', e);
  }

  return reply(`✅ Added bad word: *${word}*`);
});

cmd({
  pattern: 'deletebadword',
  desc: 'Remove bad word',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { args, q, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  if (!q && (!args || args.length === 0)) return reply('Usage: deletebadword <word>');
  let word = (q || args.join(' ')).trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'');
  let bad = await loadJson(BADWORDS_PATH, []);
  if (!Array.isArray(bad)) bad = [];
  const idx = bad.indexOf(word);
  if (idx === -1) return reply('Word not in list.');
  bad.splice(idx,1);
  await saveJson(BADWORDS_PATH, bad);
  return reply('✅ Deleted bad word.');
});

cmd({
  pattern: 'setbadwordaction',
  desc: 'Set action when a badword is detected. Options: delete|warn|kick|ban|reply|none',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  if (!args[0]) return reply('Usage: setbadwordaction <delete|warn|kick|ban|reply|none>');
  const opt = args[0].toLowerCase();
  const allowed = ['delete','warn','kick','ban','reply','none','deleteandwarn'];
  if (!allowed.includes(opt)) return reply('Invalid option.');
  const sys = await loadJson(SYSTEM_PATH, {});
  sys.settings = sys.settings || {};
  sys.settings.badwordAction = opt;
  await saveJson(SYSTEM_PATH, sys);
  return reply(`✅ Badword action set to *${opt}*`);
});

/* -----------------------
   BLACKLIST (ban/unban)
----------------------- */

async function resolveTargetFromMessage(m, text) {
  let mentioned = m.mentionedJid && m.mentionedJid[0];
  let quoted = m.quoted && (m.quoted.sender || (m.quoted.key && m.quoted.key.participant));
  if (mentioned) return mentioned;
  if (quoted) return quoted;
  if (text) {
    const digits = text.replace(/\D/g,'');
    if (digits.length >= 6) return digits + '@s.whatsapp.net';
  }
  if (m.chat) return m.chat;
  return null;
}

cmd({
  pattern: 'ban',
  desc: 'Ban (blacklist) a user/chat immediately',
  category: 'owner',
  filename: __filename,
  alias: ['addignorelist','banchat']
}, async (conn, mek, m, { args, text, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');

  const raw = await resolveTargetFromMessage(m, text);
  if (!raw) return reply('Mention, reply, or provide number.');

  const target = normalizeJid(raw);
  const bl = await loadJson(BLACKLIST_PATH, { users: [] });
  bl.users = bl.users || [];
  if (!bl.users.includes(target)) {
    bl.users.push(target);
    await saveJson(BLACKLIST_PATH, bl);
    // Try to block
    try {
      if (typeof conn.updateBlockStatus === 'function') {
        await conn.updateBlockStatus(target, 'block').catch(()=>{});
      } else if (typeof conn.blockUser === 'function') {
        await conn.blockUser(target).catch(()=>{});
      }
    } catch (e) {}
    // Attempt group removal (best-effort)
    try {
      if (m.chat && m.chat.endsWith('@g.us') && target && target.endsWith('@s.whatsapp.net')) {
        await conn.groupParticipantsUpdate(m.chat, [target], 'remove').catch(()=>{});
      }
    } catch (e) {}
    return reply(`✅ +${target.split('@')[0]} blacklisted and action attempted.`);
  } else {
    return reply(`⚠️ ${target.split('@')[0]} already blacklisted.`);
  }
});

cmd({
  pattern: 'unban',
  desc: 'Remove blacklist and try to unblock',
  category: 'owner',
  filename: __filename,
  alias: ['delignorelist']
}, async (conn, mek, m, { args, text, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  const raw = await resolveTargetFromMessage(m, text);
  if (!raw) return reply('Mention, reply, or provide number.');
  const target = normalizeJid(raw);
  const bl = await loadJson(BLACKLIST_PATH, { users: [] });
  bl.users = bl.users || [];
  const idx = bl.users.indexOf(target);
  if (idx !== -1) {
    bl.users.splice(idx, 1);
    await saveJson(BLACKLIST_PATH, bl);
    try {
      if (typeof conn.updateBlockStatus === 'function') {
        await conn.updateBlockStatus(target, 'unblock').catch(()=>{});
      } else if (typeof conn.unblockUser === 'function') {
        await conn.unblockUser(target).catch(()=>{});
      }
    } catch (e) {}
    return reply(`✅ +${target.split('@')[0]} removed from blacklist and unblocked (if possible).`);
  } else {
    return reply(`ℹ️ ${target.split('@')[0]} not found in blacklist.`);
  }
});

/* -----------------------
   Alwaysonline toggle
   - This setting only controls whether the bot will periodically send typing/recording presence
     while it is actually connected. It cannot and will not force the account to appear "online"
     when the socket is disconnected — WhatsApp controls true online status.
----------------------- */

cmd({
  pattern: 'alwaysonline',
  desc: 'Toggle presence-heartbeat (owner). Use on/off. Does NOT fake true online status.',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner }) => {
  if (!isOwner) return reply('Owner only.');
  if (!args[0]) return reply('Usage: alwaysonline on/off');
  const opt = args[0].toLowerCase();
  if (!['on','off'].includes(opt)) return reply('Use on or off');
  const sys = await loadJson(SYSTEM_PATH, {});
  sys.settings = sys.settings || {};
  sys.settings.alwaysonline = opt === 'on';
  await saveJson(SYSTEM_PATH, sys);
  // we do not call conn.sendPresenceUpdate here — presence heartbeat is managed from index.js when connected.
  return reply(`✅ Always-online heartbeat has been ${opt === 'on' ? 'enabled' : 'disabled'}.`);
});

/* -----------------------
   Welcome / Goodbye toggles + instant send preview
----------------------- 

cmd({
  pattern: 'welcome',
  desc: 'Enable / disable welcome messages in this chat (admin/owner). Usage: welcome on|off',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner, isSudo, isAdmins }) => {
  const isGroupChat = m.chat && m.chat.endsWith('@g.us');
  if (isGroupChat && !isAdmins && !isOwner && !isSudo) return reply('Admins only to toggle welcome in group.');
  if (!args[0]) return reply('Usage: welcome on/off');
  const opt = args[0].toLowerCase();
  if (!['on','off'].includes(opt)) return reply('Use on or off');
  const sys = await loadJson(SYSTEM_PATH, {});
  sys.welcome = sys.welcome || { enabledChats: {} };
  sys.welcome.enabledChats = sys.welcome.enabledChats || {};
  if (opt === 'on') sys.welcome.enabledChats[m.chat] = true;
  else delete sys.welcome.enabledChats[m.chat];
  await saveJson(SYSTEM_PATH, sys);
  return reply(`✅ Welcome messages ${opt === 'on' ? 'enabled' : 'disabled'} for this chat.`);
});

cmd({
  pattern: 'goodbye',
  desc: 'Enable / disable goodbye messages in this chat (admin/owner). Usage: goodbye on|off',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner, isSudo, isAdmins }) => {
  const isGroupChat = m.chat && m.chat.endsWith('@g.us');
  if (isGroupChat && !isAdmins && !isOwner && !isSudo) return reply('Admins only to toggle goodbye in group.');
  if (!args[0]) return reply('Usage: goodbye on/off');
  const opt = args[0].toLowerCase();
  if (!['on','off'].includes(opt)) return reply('Use on or off');
  const sys = await loadJson(SYSTEM_PATH, {});
  sys.goodbye = sys.goodbye || { enabledChats: {} };
  sys.goodbye.enabledChats = sys.goodbye.enabledChats || {};
  if (opt === 'on') sys.goodbye.enabledChats[m.chat] = true;
  else delete sys.goodbye.enabledChats[m.chat];
  await saveJson(SYSTEM_PATH, sys);
  return reply(`✅ Goodbye messages ${opt === 'on' ? 'enabled' : 'disabled'} for this chat.`);
});

// Manual preview / send welcome (standalone command)
// Usage: sendwelcome @user  OR reply to a user's message and run sendwelcome
cmd({
  pattern: 'sendwelcome',
  desc: 'Send welcome message to a user right now (admin/owner). Usage: sendwelcome (reply or mention)',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, isSudo, isAdmins }) => {
  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender) || null;
  if (!target) return reply('Mention a user or reply to their message to send welcome.');
  await handleSingleWelcomeOrGoodbye(conn, m.chat, target, 'welcome');
  return reply('✅ Welcome sent (preview).');
});

// Manual preview / send goodbye
cmd({
  pattern: 'sendgoodbye',
  desc: 'Send goodbye message to a user right now (admin/owner). Usage: sendgoodbye (reply or mention)',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, isSudo, isAdmins }) => {
  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender) || null;
  if (!target) return reply('Mention a user or reply to their message to send goodbye.');
  await handleSingleWelcomeOrGoodbye(conn, m.chat, target, 'goodbye');
  return reply('✅ Goodbye sent (preview).');
});

/* -----------------------
   WARN commands (warn/reset/set/list)
----------------------- */

// WARN a user (admin/owner)
cmd({
  pattern: 'warn',
  desc: 'Issue a warning to a user (admin/owner). Usage: warn @user or reply',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isOwner, isSudo, args, reply }) => {
  const from = m.chat;
  if (isGroup && !isAdmins && !isOwner && !isSudo) return reply('Only admins can warn users.');

  const target = (m.mentionedJid && m.mentionedJid[0]) || (m.quoted && m.quoted.sender) || null;
  if (!target) return reply('Mention a user or reply to their message to warn.');

  const { now, warnLimit, sys } = await incrementWarningForChat(from, target);

  try {
    if (sys.settings && sys.settings.deleteOnWarn && m.quoted && m.quoted.key) {
      await conn.sendMessage(from, { delete: m.quoted.key }).catch(()=>{});
    }
  } catch(e){}

  if (now >= warnLimit) {
    if (sys.settings.onWarnLimit === 'kick' && from && from.endsWith('@g.us')) {
      try {
        await conn.groupParticipantsUpdate(from, [target], 'remove').catch(()=>{});
        await conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} removed for reaching warn limit (${warnLimit}).`, contextInfo: { mentionedJid: [target] } }).catch(()=>{});
      } catch (e) {
        await conn.sendMessage(from, { text: `⚠️ Failed to remove @${target.split('@')[0]} — missing permission.`, contextInfo: { mentionedJid: [target] } }).catch(()=>{});
      }
    } else if (sys.settings.onWarnLimit === 'ban') {
      const bl = await loadJson(BLACKLIST_PATH, { users: [] });
      bl.users = bl.users || [];
      if (!bl.users.includes(target)) {
        bl.users.push(target);
        await saveJson(BLACKLIST_PATH, bl);
      }
      await conn.sendMessage(from, { text: `🚫 @${target.split('@')[0]} blacklisted: reached warn limit (${warnLimit}).`, contextInfo: { mentionedJid: [target] } }).catch(()=>{});
    }
    // clear warns
    const dbw = await loadJson(WARN_PATH, {});
    dbw.chats = dbw.chats || {};
    if (dbw.chats[from] && dbw.chats[from].warnings) delete dbw.chats[from].warnings[target];
    await saveJson(WARN_PATH, dbw);
    return;
  } else {
    await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} Warning ${now}/${warnLimit}`, contextInfo: { mentionedJid: [target] } }, { quoted: m }).catch(()=>{});
  }
});

cmd({
  pattern: 'resetwarn',
  desc: 'Reset warnings for a user (group/admin)',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isOwner, isSudo, reply }) => {
  const from = m.chat;
  if (isGroup && !isAdmins && !isOwner && !isSudo) return reply('Only admins can reset warnings.');
  let user = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
  if (!user) return reply('*Mention a user or reply to their message to reset their warnings.*');

  let db = await loadJson(WARN_PATH, {});
  db.chats = db.chats || {};
  const chatDb = db.chats[from] || {};

  if (!chatDb.warnings || !chatDb.warnings[user]) return reply('*User has no warnings to reset.*');

  delete chatDb.warnings[user];
  db.chats[from] = chatDb;
  await saveJson(WARN_PATH, db);

  await conn.sendMessage(from, {
    text: `✅ *Warnings for @${user.split('@')[0]} have been reset!*`,
    contextInfo: { mentionedJid: [user] }
  }, { quoted: m });
});

cmd({
  pattern: 'setwarn',
  desc: 'Set warn limit for chat (admin/owner)',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isOwner, isSudo, args, reply }) => {
  const from = m.chat;
  if (isGroup && !isAdmins && !isOwner && !isSudo) return reply('Admins only.');
  const limit = parseInt(args[0]);
  if (!limit || isNaN(limit) || limit < 1) return reply('*Please provide a valid warn limit (minimum 1).*');

  let db = await loadJson(WARN_PATH, {});
  db.chats = db.chats || {};
  db.chats[from] = db.chats[from] || {};
  db.chats[from].warnLimit = limit;
  await saveJson(WARN_PATH, db);

  return reply(`✅ *Warn limit set to ${limit}.*`);
});

cmd({
  pattern: 'listwarn',
  desc: 'List warned users in chat',
  category: 'moderation',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  const from = m.chat;
  let db = await loadJson(WARN_PATH, {});
  db.chats = db.chats || {};
  const targetDB = db.chats[from] || {};
  const warnLimit = targetDB.warnLimit || 5;
  const warnings = targetDB.warnings || {};

  if (!warnings || Object.keys(warnings).length === 0) return reply('*No users have been warned.*');

  let warnList = Object.entries(warnings)
    .map(([user, count]) => `@${user.split('@')[0]} - ${count} warns`)
    .join('\n');

  await conn.sendMessage(from, {
    text: `⚠️ *Warn Limit: ${warnLimit}*\n\n${warnList}`,
    contextInfo: { mentionedJid: Object.keys(warnings) }
  }, { quoted: m });
});

/* -----------------------
   INTERNAL / EXPORTS: enforcement + welcome handler
----------------------- */

async function _matchBadwordInText(badwords, text) {
  if (!text) return null;
  const plain = normalizeText(text);
  for (const w of badwords) {
    const needle = normalizeText(w);
    if (!needle) continue;
    const rx = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (rx.test(plain) || plain.includes(needle)) return w;
  }
  return null;
}

/**
 * enforceBadwords(conn, mek, m, opts)
 * opts = { isOwner, isSudo: boolean, isAdmins: boolean, isBotAdmins: boolean }
 *
 * Returns { handled: boolean, reason?: string }
 */
async function enforceBadwords(conn, mek, m, opts = {}) {
  try {
    if (!mek || !m) return { handled: false };
    const sys = await ensureSystemDefaults();
    const bad = await loadJson(BADWORDS_PATH, []);
    if (!Array.isArray(bad) || bad.length === 0) return { handled: false };

    const text = extractMessageText(mek) || m.text || m.body || '';
    if (!text) return { handled: false };

    const matched = await _matchBadwordInText(bad, text);
    if (!matched) return { handled: false };

    // determine chat and sender
    const chatId = mek.key?.remoteJid || m.chat;
    const senderId = mek.key?.participant || m.sender || mek.key?.participant || undefined;

    // If group, skip enforcement for admins and owner by default (prevents punishing mods)
    if (chatId && chatId.endsWith('@g.us')) {
      // if opts provided, prefer that; otherwise try to fetch
      let isAdmin = !!opts.isAdmins;
      let isOwnerUser = !!opts.isOwner, isSudo;
      if (!opts.isAdmins && !opts.isOwner, isSudo) {
        isAdmin = await isMemberAdmin(conn, chatId, senderId).catch(()=>false);
        // owner check: match configured owner numbers (simple)
        const ownerNums = (config.OWNER_NUMBER || '').toString();
        if (ownerNums) {
          const ownerList = ownerNums.split(/[,\s]+/).map(x => x.replace(/\D/g,''));
          if (ownerList.includes(String(senderId).split('@')[0])) isOwnerUser = true;
        }
      }
      if (isAdmin || isOwnerUser) {
        // skip punishing admins/owner
        return { handled: false, reason: 'skipped_admin_or_owner' };
      }
    }

    // Found badword — apply action
    const action = (sys.settings && sys.settings.badwordAction) || 'warn';

    async function tryDelete() {
      try {
        if (mek.key) {
          await conn.sendMessage(chatId, { delete: mek.key }).catch(()=>{});
        }
      } catch (e) {}
    }

    if (action === 'delete') {
      await tryDelete();
      return { handled: true, reason: 'deleted' };
    }

    if (action === 'reply') {
      await conn.sendMessage(chatId, { text: `⚠️ Your message contains a banned word.` , contextInfo: { mentionedJid: [senderId] } }, { quoted: mek }).catch(()=>{});
      return { handled: true, reason: 'replied' };
    }

    if (action === 'warn' || action === 'deleteandwarn' || action === 'deleteandwarn') {
      if (sys.settings.deleteOnWarn) await tryDelete();
      if (senderId) {
        const { now, warnLimit, sys: s } = await incrementWarningForChat(chatId, senderId);
        if (now >= warnLimit) {
          if (s.settings.onWarnLimit === 'kick') {
            try {
              await conn.groupParticipantsUpdate(chatId, [senderId], 'remove').catch(()=>{});
              await conn.sendMessage(chatId, { text: `👢 @${senderId.split('@')[0]} removed for repeated violations.`, contextInfo: { mentionedJid: [senderId] } }, { quoted: mek }).catch(()=>{});
            } catch (e) {
              await conn.sendMessage(chatId, { text: `⚠️ Tried to remove @${senderId.split('@')[0]} but couldn't (missing permission).`, contextInfo: { mentionedJid: [senderId] } }, { quoted: mek }).catch(()=>{});
            }
          } else if (s.settings.onWarnLimit === 'ban') {
            const bl = await loadJson(BLACKLIST_PATH, { users: [] });
            bl.users = bl.users || [];
            if (!bl.users.includes(senderId)) {
              bl.users.push(senderId);
              await saveJson(BLACKLIST_PATH, bl);
            }
            await conn.sendMessage(chatId, { text: `🚫 @${senderId.split('@')[0]} blacklisted: reached warn limit.`, contextInfo: { mentionedJid: [senderId] } }, { quoted: mek }).catch(()=>{});
          }
          // clear warns after action
          const dbw = await loadJson(WARN_PATH, {});
          dbw.chats = dbw.chats || {};
          if (dbw.chats[chatId] && dbw.chats[chatId].warnings) delete dbw.chats[chatId].warnings[senderId];
          await saveJson(WARN_PATH, dbw);
          return { handled: true, reason: 'warn_limit_reached' };
        } else {
          await conn.sendMessage(chatId, { text: `⚠️ @${senderId.split('@')[0]} Warning ${now}/${warnLimit}`, contextInfo: { mentionedJid: [senderId] } }, { quoted: mek }).catch(()=>{});
          return { handled: true, reason: 'warned' };
        }
      } else {
        return { handled: true, reason: 'warned_no_sender' };
      }
    }

    if (action === 'kick') {
      const senderId2 = senderId;
      if (senderId2 && chatId && chatId.endsWith('@g.us')) {
        try {
          await conn.groupParticipantsUpdate(chatId, [senderId2], 'remove').catch(()=>{});
          await conn.sendMessage(chatId, { text: `👢 @${senderId2.split('@')[0]} removed for using banned words.`, contextInfo: { mentionedJid: [senderId2] } }, { quoted: mek }).catch(()=>{});
          return { handled: true, reason: 'kicked' };
        } catch (e) {
          return { handled: false, reason: 'kick_failed' };
        }
      }
      return { handled: false, reason: 'kick_no_group' };
    }

    if (action === 'ban') {
      const senderId2 = senderId;
      if (senderId2) {
        const bl = await loadJson(BLACKLIST_PATH, { users: [] });
        bl.users = bl.users || [];
        if (!bl.users.includes(senderId2)) {
          bl.users.push(senderId2);
          await saveJson(BLACKLIST_PATH, bl);
        }
        try {
          if (typeof conn.updateBlockStatus === 'function') {
            await conn.updateBlockStatus(senderId2, 'block').catch(()=>{});
          } else if (typeof conn.blockUser === 'function') {
            await conn.blockUser(senderId2).catch(()=>{});
          }
        } catch (e) {}
        try {
          if (m.chat && m.chat.endsWith('@g.us')) {
            await conn.groupParticipantsUpdate(m.chat, [senderId2], 'remove').catch(()=>{});
          }
        } catch(e){}
        return { handled: true, reason: 'banned' };
      }
      return { handled: false, reason: 'ban_no_sender' };
    }

    return { handled: false };
  } catch (err) {
    console.error('enforceBadwords error', err);
    return { handled: false, reason: 'error' };
  }
}

/* -----------------------
   Welcome / Goodbye message helpers
   - handleGroupParticipantsUpdate(conn, update): exported for index.js to call
   - handleSingleWelcomeOrGoodbye(conn, gid, participantJid, type): helper for commands
----------------------- */

async function handleSingleWelcomeOrGoodbye(conn, gid, participantJid, type='welcome') {
  try {
    const sysRaw = await loadJson(SYSTEM_PATH, {});
    const sys = sysRaw || {};
    const template = (sys.settings && (type === 'welcome' ? sys.settings.welcomemsg : sys.settings.goodbyemsg)) || '';
    if (!template) {
      // nothing configured — send a simple mention + name fallback
      const text = type === 'welcome' ? `✨ Welcome @${participantJid.split('@')[0]}!` : `😢 Goodbye @${participantJid.split('@')[0]}!`;
      const dp = await getProfilePictureUrlSafe(conn, participantJid);
      await conn.sendMessage(gid, { image: { url: dp }, caption: text, contextInfo: { mentionedJid: [participantJid] } }).catch(()=>{});
      return;
    }

    // fetch group meta for {group} and count
    let meta = null;
    try { meta = await conn.groupMetadata(gid).catch(()=>null); } catch(e){}
    const groupName = meta?.subject || gid.split('@')[0];
    const memberCount = meta?.participants?.length || '';

    // build message
    const out = template
      .replace(/{user}/g, `@${participantJid.split('@')[0]}`)
      .replace(/{group}/g, groupName)
      .replace(/{count}/g, memberCount);

    const dp = await getProfilePictureUrlSafe(conn, participantJid);
    await conn.sendMessage(gid, { image: { url: dp }, caption: out, contextInfo: { mentionedJid: [participantJid] } }).catch(()=>{});
  } catch (e) {
    console.error('handleSingleWelcomeOrGoodbye error', e);
  }
}

async function handleGroupParticipantsUpdate(conn, update) {
  try {
    const gid = update.id;
    const participants = update.participants || [];
    const action = update.action; // 'add' | 'remove' | 'promote' | 'demote'
    const sysRaw = await loadJson(SYSTEM_PATH, {});
    const sys = sysRaw || {};

    // if added, and welcome enabled for this chat, send welcome(s)
    if (action === 'add') {
      const welcomeEnabled = sys?.welcome?.enabledChats && sys.welcome.enabledChats[gid];
      if (!welcomeEnabled) return;
      for (const p of participants) {
        await handleSingleWelcomeOrGoodbye(conn, gid, p, 'welcome');
      }
    }

    // if removed, and goodbye enabled for this chat, send goodbyes
    if (action === 'remove') {
      const goodbyeEnabled = sys?.goodbye?.enabledChats && sys.goodbye.enabledChats[gid];
      if (!goodbyeEnabled) return;
      for (const p of participants) {
        await handleSingleWelcomeOrGoodbye(conn, gid, p, 'goodbye');
      }
    }

  } catch (e) {
    console.error('handleGroupParticipantsUpdate error', e);
  }
}

module.exports = {
  enforceBadwords,
  handleGroupParticipantsUpdate,
  // helpers exported for debug or advanced usage
  _internal: {
    incrementWarningForChat,
    getProfilePictureUrlSafe,
    isMemberAdmin,
  }
};