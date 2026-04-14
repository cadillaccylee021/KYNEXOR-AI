// plugins/sudo.js — uses botdb (replaces sudo.json)
'use strict';

const { cmd }                                    = require('../command');
const { isSudo, addSudo, removeSudo, listSudo }  = require('../lib/botdb');
const { lidToPhone }                             = require('../lib/lid');

// Resolve a JID — if it's a LID, convert to phone number first
async function resolveJid(conn, jid) {
  if (!jid) return null;
  if (String(jid).endsWith('@lid')) {
    const resolved = await lidToPhone(conn, jid);
    if (resolved && !String(resolved).endsWith('@lid')) {
      return resolved.includes('@') ? resolved : resolved + '@s.whatsapp.net';
    }
  }
  return jid;
}

cmd({
  pattern: 'setsudo',
  desc: 'Grant sudo access to a user (mention, reply or number)',
  category: 'admin',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply, args }) => {
  if (!isOwner) return reply('❌ Owner only.');

  let userJid =
    (m.mentionedJid && m.mentionedJid[0]) ||
    (m.quoted && m.quoted.sender) ||
    (args[0] ? args[0].replace(/\D/g,'') + '@s.whatsapp.net' : null);

  if (!userJid) return reply('⚠️ Mention, reply, or provide a number.');

  // Resolve LID → phone number before storing
  userJid = await resolveJid(conn, userJid);
  const num = userJid.split('@')[0].replace(/\D/g,'');

  if (isSudo(num)) return reply('✅ User already has sudo access.');
  addSudo(num);
  return reply(`✅ @${num} granted sudo access.`, { mentions: [userJid] });
});

cmd({
  pattern: 'removesudo',
  alias: ['unsudo'],
  desc: 'Revoke sudo access',
  category: 'admin',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply, args }) => {
  if (!isOwner) return reply('❌ Owner only.');

  let userJid =
    (m.mentionedJid && m.mentionedJid[0]) ||
    (m.quoted && m.quoted.sender) ||
    (args[0] ? args[0].replace(/\D/g,'') + '@s.whatsapp.net' : null);

  if (!userJid) return reply('⚠️ Mention, reply, or provide a number.');

  userJid = await resolveJid(conn, userJid);
  const num = userJid.split('@')[0].replace(/\D/g,'');
  removeSudo(num);
  return reply(`✅ Sudo access revoked for @${num}.`, { mentions: [userJid] });
});

cmd({
  pattern: 'sudolist',
  desc: 'List all sudo users',
  category: 'admin',
  filename: __filename,
}, async (conn, mek, m, { isOwner, reply }) => {
  if (!isOwner) return reply('❌ Owner only.');
  const list = listSudo();
  if (!list.length) return reply('No sudo users set.');
  return reply(`*Sudo Users (${list.length}):*\n${list.map(n=>`• ${n}`).join('\n')}`);
});
