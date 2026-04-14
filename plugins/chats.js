// plugins/chats.js — afk, unafk, autobio, pmpermit, approve, disapprove, bgm, addbgm, delbgm, allbgm, logout
// Exports: checkAfkMention, checkBgm, checkPmPermit  — call these inline from index.js upsert handler
'use strict';

const path = require('path');
const fs   = require('fs');
const { cmd }  = require('../command');
const config   = require('../config');

// ── JSON storage helpers ──────────────────────────────────────────────────────
function store(name) {
  const file = path.join(__dirname, '../lib', name + '.json');
  return {
    load() {
      try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
      return {};
    },
    save(data) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
      } catch (e) { console.error('chats store save error:', e.message); }
    }
  };
}

const afkStore    = store('afk');
const permitStore = store('pmpermit');   // { [botNumber]: { enabled, values } }
const userStore   = store('permitusers');// { [jid]: { permit, times, name } }
const bgmStore    = store('bgm');        // { [botNumber]: { enabled, songs: { name: url } } }
const bioStore    = store('autobio');    // { [botNumber]: templateString | 'false' }

let afkData    = afkStore.load();   // { [jid]: { reason, lastseen, users: {} } }
let permitData = permitStore.load();
let userData   = userStore.load();
let bgmData    = bgmStore.load();
let bioData    = bioStore.load();

// autobio cron
let bioJob = null;
let bioJobBotNumber = null;
try { require('node-cron'); } catch (e) { console.warn('node-cron not installed — autobio cron disabled'); }

// ── helpers ───────────────────────────────────────────────────────────────────
function timeDiff(date) {
  const ms   = Date.now() - new Date(date).getTime();
  const d    = Math.floor(ms / 86400000);
  const h    = Math.floor((ms % 86400000) / 3600000);
  const m    = Math.floor((ms % 3600000) / 60000);
  return (d ? `${d}d ` : '') + `${h}h ${m}m`;
}

async function fillBioTemplate(tmpl) {
  const now = new Date();
  return tmpl
    .replace(/@time/gi,  now.toLocaleTimeString())
    .replace(/@date/gi,  now.toDateString())
    .replace(/@bot/gi,   config.BOT_NAME || 'QUEEN_KYLIE-V1')
    .replace(/@owner/gi, config.OWNER_NAME || 'cylee');
}

// ─────────────────────────────────────────────────────────────────────────────
// AFK
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'afk',
  desc: 'Set yourself as Away From Keyboard',
  category: 'chats',
  use: '<reason>',
  filename: __filename,
}, async (conn, mek, m, { from, sender, pushname, reply, q }) => {
  if (!q) return reply(
    `*Set AFK with a reason:*\n:afk brb in a bit\n\n` +
    `Supported tags: @time @date\n*To return:* :unafk`
  );

  const reason = q
    .replace(/@time/gi, new Date().toLocaleTimeString())
    .replace(/@date/gi, new Date().toDateString());

  if (!afkData[sender]) afkData[sender] = { users: {} };
  afkData[sender].reason   = reason;
  afkData[sender].lastseen = new Date().toISOString();
  afkData[sender].users    = {};
  afkStore.save(afkData);

  reply(`✅ *${pushname} is now AFK*\n*Reason:* ${reason}`);
});

cmd({
  pattern: 'unafk',
  alias: ['back', 'iamback'],
  desc: 'Mark yourself as back (removes AFK)',
  category: 'chats',
  filename: __filename,
}, async (conn, mek, m, { sender, pushname, reply }) => {
  if (!afkData[sender]) return reply('*You are not AFK.*');
  const diff = timeDiff(afkData[sender].lastseen);
  delete afkData[sender];
  afkStore.save(afkData);
  reply(`✅ *Welcome back ${pushname}!*\n*You were AFK for:* ${diff}`);
});

// AFK mention checker — call from index.js inside upsert
async function checkAfkMention(conn, mek, from, sender) {
  try {
    if (mek.key?.fromMe) return;

    // Collect mentioned + replied-to jids
    const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const replied   = mek.message?.extendedTextMessage?.contextInfo?.participant;
    const targets   = [...new Set([...mentioned, ...(replied ? [replied] : [])])];

    for (const jid of targets) {
      if (!afkData[jid] || jid === sender) continue;
      const afk = afkData[jid];
      if (!afk.users) afk.users = {};
      if (!afk.users[sender]) afk.users[sender] = 0;
      afk.users[sender]++;
      if (afk.users[sender] > 3) continue;

      const prefix = afk.users[sender] === 2 ? '*Hey, I already told you!*\n' :
                     afk.users[sender] === 3 ? '*Stop spamming!*\n' : '';
      const msg = `${prefix}*@${jid.split('@')[0]} is currently AFK*\n*Reason:* ${afk.reason}\n*Last seen:* ${timeDiff(afk.lastseen)} ago`;
      await conn.sendMessage(from, { text: msg, mentions: [jid] }, { quoted: mek });
      afkStore.save(afkData);
    }

    // Remove sender's own AFK when they speak
    if (afkData[sender]) {
      const diff = timeDiff(afkData[sender].lastseen);
      await conn.sendMessage(from, {
        text: `*Welcome back @${sender.split('@')[0]}!* You were AFK for ${diff}`,
        mentions: [sender]
      }, { quoted: mek });
      delete afkData[sender];
      afkStore.save(afkData);
    }
  } catch (e) { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOBIO
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'autobio',
  alias: ['abio'],
  desc: 'Auto-update WhatsApp bio on a timer',
  category: 'tools',
  use: '<on | off | custom text with @time @date @bot>',
  filename: __filename,
}, async (conn, mek, m, { botNumber, isOwner, reply, q }) => {
  if (!isOwner) return reply('🚫 Owner only.');

  const cur = bioData[botNumber] || 'false';
  if (!q) {
    return reply(
      `*AutoBio:* ${cur === 'false' ? 'OFF ❌' : `ON ✅\n*Template:* ${cur}`}\n\n` +
      `:autobio on  → default template\n` +
      `:autobio off → disable\n` +
      `:autobio @time — @bot is alive → custom template\n\n` +
      `*Tags:* @time @date @bot @owner`
    );
  }

  const arg = q.toLowerCase().trim();

  if (['off', 'disable', 'deact'].includes(arg)) {
    if (bioJob) { try { bioJob.stop(); } catch {} bioJob = null; }
    bioData[botNumber] = 'false';
    bioStore.save(bioData);
    return reply('✅ *AutoBio disabled*');
  }

  const template = (arg === 'on' || arg === 'true')
    ? 'Auto Bio | ⏰ @time | 🤖 @bot'
    : q;

  bioData[botNumber] = template;
  bioStore.save(bioData);

  const preview = await fillBioTemplate(template);
  try { await conn.updateProfileStatus(preview); } catch (e) {}

  // Start cron if not running for this bot
  try {
    const cron = require('node-cron');
    if (bioJob) { try { bioJob.stop(); } catch {} }
    bioJobBotNumber = botNumber;
    bioJob = cron.schedule('*/2 * * * *', async () => {
      try {
        const tmpl = bioData[bioJobBotNumber];
        if (!tmpl || tmpl === 'false') { bioJob.stop(); return; }
        await conn.updateProfileStatus(await fillBioTemplate(tmpl));
      } catch (e) {}
    }, { scheduled: true });
    reply(`✅ *AutoBio enabled*\n*Template:* ${template}\n*Preview:* ${preview}\n\n_Bio updates every 2 minutes_`);
  } catch (e) {
    reply(`✅ *AutoBio saved* (cron disabled — install node-cron)\n*Preview:* ${preview}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PMPERMIT
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'pmpermit',
  alias: ['permit'],
  desc: 'Enable/disable PM permit (block unknown DMs)',
  category: 'owner',
  use: '<on | off | on | all | on | 234,27>',
  filename: __filename,
}, async (conn, mek, m, { botNumber, isOwner, reply, q }) => {
  if (!isOwner) return reply('🚫 Owner only.');

  const s   = permitData[botNumber] || { enabled: false, values: 'all' };
  const arg = q ? q.toLowerCase().trim() : '';

  if (!arg) {
    return reply(
      `*PM Permit:* ${s.enabled ? `ON ✅ (${s.values})` : 'OFF ❌'}\n\n` +
      `:pmpermit on      — block all unknown DMs\n` +
      `:pmpermit on | 234,27 — block by country code\n` +
      `:pmpermit off     — disable`
    );
  }

  const action = arg.split('|')[0].trim();
  const codes  = (arg.split('|')[1] || '').trim();
  const values = codes.startsWith('all') || !codes ? 'all'
    : codes.split(',').map(c => parseInt(c)).filter(n => !isNaN(n)).join(',') || 'all';

  if (['on', 'enable', 'act'].includes(action)) {
    permitData[botNumber] = { enabled: true, values };
    permitStore.save(permitData);
    return reply(`✅ *PM Permit ON* — blocking ${values === 'all' ? 'everyone' : `country codes: ${values}`}`);
  }
  if (['off', 'disable', 'deact'].includes(action)) {
    permitData[botNumber] = { enabled: false, values: s.values };
    permitStore.save(permitData);
    return reply('✅ *PM Permit OFF*');
  }
  reply('*Use: on / on | all / on | 234,27 / off*');
});

cmd({
  pattern: 'approve',
  alias: ['a'],
  desc: 'Approve a user to DM the bot',
  category: 'owner',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return reply('*Reply to a message from the user you want to approve.*');
  const target = ctx.participant || ctx.remoteJid;
  if (!target) return reply('*Could not determine user.*');
  if (!userData[target]) userData[target] = { permit: 'false', times: 0 };
  if (userData[target].permit === 'true') return reply(`*This user is already approved.*`);
  userData[target].permit = 'true';
  userData[target].times  = 0;
  userStore.save(userData);
  reply(`✅ *Approved @${target.split('@')[0]} for DMs.*`);
});

cmd({
  pattern: 'disapprove',
  alias: ['da', 'unapprove'],
  desc: 'Revoke a user\'s DM permission',
  category: 'owner',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return reply('*Reply to a message from the user you want to disapprove.*');
  const target = ctx.participant || ctx.remoteJid;
  if (!target) return reply('*Could not determine user.*');
  if (!userData[target]) userData[target] = { permit: 'false', times: 0 };
  userData[target].permit = 'false';
  userStore.save(userData);
  reply(`✅ *Revoked DM permission for @${target.split('@')[0]}.*`);
});

// PM permit checker — call from index.js inside upsert (before command dispatch, return true to block)
async function checkPmPermit(conn, mek, from, sender, isGroup, isOwner, botNumber) {
  try {
    if (isGroup || isOwner || mek.key?.fromMe) return false;
    const s = permitData[botNumber];
    if (!s || !s.enabled) return false;

    // Check if sender matches the filter
    const senderNum = sender.split('@')[0];
    const shouldCheck = s.values === 'all' || s.values.split(',').some(c => senderNum.startsWith(c.trim()));
    if (!shouldCheck) return false;

    if (!userData[sender]) userData[sender] = { permit: 'false', times: 0 };
    if (userData[sender].permit === 'true') return false;

    // Blocked — send warning
    const times = parseInt(userData[sender].times) || 0;
    let msg;
    if (times === 0) {
      msg = `*Hi! This is ${config.BOT_NAME || 'QUEEN_KYLIE-V1'}, a Personal Assistant.*\n\n` +
            `*Please do not message in DM. You may be blocked automatically.*\n` +
            `_Wait for the owner to respond._`;
    } else {
      msg = `*Please do not spam. You have ${times + 1} warning(s).*` +
            (times === 1 ? '\n*You will be blocked automatically.*' : '');
    }

    userData[sender].times = times + 1;
    userStore.save(userData);
    await conn.sendMessage(from, { text: msg }, { quoted: mek });

    const warnLimit = 3;
    if (userData[sender].times >= warnLimit) {
      try { await conn.updateBlockStatus(sender, 'block'); } catch {}
    }
    return true; // block further processing
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// BGM
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'bgm',
  desc: 'Enable/disable BGM sound triggers',
  category: 'tools',
  use: '<on | off>',
  filename: __filename,
}, async (conn, mek, m, { botNumber, isOwner, reply, q }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  const arg = q ? q.toLowerCase().trim() : '';
  if (!bgmData[botNumber]) bgmData[botNumber] = { enabled: false, songs: {} };
  const cur = bgmData[botNumber].enabled;

  if (!arg) return reply(`*BGM:* ${cur ? 'ON ✅' : 'OFF ❌'}\nUse :bgm on / :bgm off`);

  if (['on', 'enable', 'act'].includes(arg)) {
    bgmData[botNumber].enabled = true;
    bgmStore.save(bgmData);
    return reply('✅ *BGM enabled*');
  }
  if (['off', 'disable', 'deact'].includes(arg)) {
    bgmData[botNumber].enabled = false;
    bgmStore.save(bgmData);
    return reply('✅ *BGM disabled*');
  }
  reply('*Use: on / off*');
});

cmd({
  pattern: 'addbgm',
  alias: ['abgm', 'newbgm'],
  desc: 'Add an audio URL as a BGM trigger',
  category: 'tools',
  use: '<songname> (reply to audio)',
  filename: __filename,
}, async (conn, mek, m, { botNumber, isOwner, reply, q }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  if (!q)       return reply('*Provide a song name.*\nExample: :addbgm kylie (reply to audio)');

  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage?.audioMessage) return reply('*Reply to an audio message!*');

  // Upload to catbox to get a URL
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const FormData = require('form-data');
  const axios    = require('axios');

  try {
    await reply('_Uploading audio..._');
    const target = { key: { remoteJid: mek.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
    const buf    = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', '');
    form.append('fileToUpload', buf, { filename: q + '.mp3' });
    const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 60000 });
    const url = res.data?.trim();
    if (!url?.startsWith('https')) throw new Error('Upload failed');

    if (!bgmData[botNumber]) bgmData[botNumber] = { enabled: false, songs: {} };
    bgmData[botNumber].songs[q.toLowerCase()] = url;
    bgmStore.save(bgmData);
    reply(`✅ *BGM song added: ${q}*`);
  } catch (e) {
    reply('❌ Failed to add BGM song: ' + e.message);
  }
});

cmd({
  pattern: 'delbgm',
  desc: 'Remove a BGM song by name',
  category: 'tools',
  use: '<songname>',
  filename: __filename,
}, async (conn, mek, m, { botNumber, isOwner, reply, q }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  if (!q)       return reply('*Provide the song name to delete.*');
  if (!bgmData[botNumber]?.songs?.[q.toLowerCase()]) return reply(`*No song named "${q}" found.*`);
  delete bgmData[botNumber].songs[q.toLowerCase()];
  bgmStore.save(bgmData);
  reply(`✅ *Removed BGM song: ${q}*`);
});

cmd({
  pattern: 'allbgm',
  alias: ['listbgm', 'getbgm'],
  desc: 'List all BGM songs',
  category: 'tools',
  filename: __filename,
}, async (conn, mek, m, { botNumber, reply }) => {
  const songs = bgmData[botNumber]?.songs || {};
  const keys  = Object.keys(songs);
  if (!keys.length) return reply('*No BGM songs added yet.*\nUse :addbgm to add one.');
  reply(`*BGM Songs (${keys.length}):*\n\n` + keys.map((k, i) => `${i + 1}. ${k}`).join('\n'));
});

// BGM checker — call from index.js inside upsert (fire and forget)
async function checkBgm(conn, mek, body, from, botNumber) {
  try {
    if (mek.key?.fromMe || !body) return;
    const d = bgmData[botNumber];
    if (!d?.enabled || !d.songs) return;
    const lower = ' ' + body.toLowerCase() + ' ';
    for (const [name, url] of Object.entries(d.songs)) {
      if (lower.includes(name + ' ') || lower.includes(' ' + name)) {
        await conn.sendMessage(from, {
          audio: { url },
          mimetype: 'audio/mpeg',
          ptt: true,
          waveform: [99,75,25,0,0,0,0,0,0,0,0,0,5,25,50,75,99,75,50,25,0]
        }, { quoted: mek });
        break; // only first match
      }
    }
  } catch (e) { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'logout',
  desc: 'Log out the bot from WhatsApp',
  category: 'owner',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');
  await reply('*Logging out... Bye! 👋*');
  try { await conn.logout(); } catch (e) { console.error('logout error:', e.message); }
});

module.exports = { checkAfkMention, checkBgm, checkPmPermit };
