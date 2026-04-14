// plugins/welcome2.js — Queen Kylie Bot
// Toggle commands for welcome/goodbye using Queen Kylie's native botdb (getGreetings/setWelcome/setGoodbye)
'use strict';

const { cmd } = require('../command');
const botdb   = require('../lib/botdb');

// ── setwelcome ────────────────────────────────────────────────────────
cmd({
  pattern:  'setwelcome',
  desc:     'Set welcome message for new members (or "off" to disable)\nVars: @{user} @{group}',
  category: 'group',
  react:    '👋',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, q, groupName, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');

  if (!q || q.toLowerCase() === 'off') {
    botdb.setWelcome(from, false, '');
    return reply('✅ Welcome message *disabled*.');
  }

  botdb.setWelcome(from, true, q);
  const preview = q
    .replace(/@\{user\}|\{user\}/gi, '@NewMember')
    .replace(/\{group\}/gi, groupName || 'Group');
  reply(`✅ *Welcome message set!*\n\n*Preview:*\n${preview}\n\n_Vars: @{user} for name, {group} for group name_`);
});

// ── setgoodbye ────────────────────────────────────────────────────────
cmd({
  pattern:  'setgoodbye',
  alias:    ['setbye'],
  desc:     'Set goodbye message for leaving members (or "off" to disable)\nVars: @{user} @{group}',
  category: 'group',
  react:    '🚪',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, q, groupName, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');

  if (!q || q.toLowerCase() === 'off') {
    botdb.setGoodbye(from, false, '');
    return reply('✅ Goodbye message *disabled*.');
  }

  botdb.setGoodbye(from, true, q);
  const preview = q
    .replace(/@\{user\}|\{user\}/gi, '@LeavingMember')
    .replace(/\{group\}/gi, groupName || 'Group');
  reply(`✅ *Goodbye message set!*\n\n*Preview:*\n${preview}\n\n_Vars: @{user} for name, {group} for group name_`);
});

// ── welcomestatus ─────────────────────────────────────────────────────
cmd({
  pattern:  'welcomestatus',
  alias:    ['greetingstatus'],
  desc:     'Check welcome/goodbye settings for this group',
  category: 'group',
  react:    '⚙️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  const s = botdb.getGreetings(from);
  await conn.sendMessage(from, {
    text:
      `⚙️ *Welcome/Goodbye Status*\n\n` +
      `👋 Welcome: ${s.welcome_enabled ? '✅ ON' : '❌ OFF'}\n` +
      (s.welcome_msg ? `   _"${s.welcome_msg.substring(0, 80)}${s.welcome_msg.length > 80 ? '...' : ''}"_\n` : '') +
      `🚪 Goodbye: ${s.goodbye_enabled ? '✅ ON' : '❌ OFF'}\n` +
      (s.goodbye_msg ? `   _"${s.goodbye_msg.substring(0, 80)}${s.goodbye_msg.length > 80 ? '...' : ''}"_\n` : '') +
      `\n_Vars: @{user} @{group}_`
  }, { quoted: mek });
});
