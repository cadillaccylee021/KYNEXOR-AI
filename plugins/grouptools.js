// plugins/grouptools.js — Queen Kylie Bot
// Extra group management tools
'use strict';

const { cmd } = require('../command');

// ── listadmins ────────────────────────────────────────────────────────
cmd({
  pattern:  'listadmins',
  alias:    ['admins', 'groupadmins'],
  desc:     'List all group admins',
  category: 'group',
  react:    '👑',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, groupAdmins, participants, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!participants?.length) return reply('❌ Could not fetch group info.');
  const admins = participants.filter(p => p.admin);
  if (!admins.length) return reply('❌ No admins found.');
  const lines = admins.map((a, i) =>
    `${i + 1}. ${a.admin === 'superadmin' ? '👑 Creator' : '⭐ Admin'} — @${a.id.split('@')[0]}`
  );
  await conn.sendMessage(from, {
    text: `👑 *Group Admins (${admins.length})*\n\n${lines.join('\n')}`,
    mentions: admins.map(a => a.id)
  }, { quoted: mek });
});

// ── members ───────────────────────────────────────────────────────────
cmd({
  pattern:  'members',
  alias:    ['memberlist'],
  desc:     'List all group members',
  category: 'group',
  react:    '👥',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, groupName, participants, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!participants?.length) return reply('❌ Could not fetch group info.');
  const lines = participants.map((p, i) => {
    const badge = p.admin === 'superadmin' ? '👑' : p.admin ? '⭐' : '👤';
    return `${i + 1}. ${badge} +${p.id.split('@')[0]}`;
  });
  const text = `👥 *${groupName} (${participants.length} members)*\n\n${lines.join('\n')}`;
  await conn.sendMessage(from, { text: text.substring(0, 4000) }, { quoted: mek });
});

// ── invitelink ────────────────────────────────────────────────────────
cmd({
  pattern:  'invitelink',
  alias:    ['getlink', 'glink'],
  desc:     'Get the group invite link (admins only)',
  category: 'group',
  react:    '🔗',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  try {
    const code = await conn.groupInviteCode(from);
    await conn.sendMessage(from, {
      text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`
    }, { quoted: mek });
  } catch { reply('❌ Failed to get link. Make sure I am an admin.'); }
});

// ── revoke ────────────────────────────────────────────────────────────
cmd({
  pattern:  'revoke',
  alias:    ['revokelink', 'resetlink'],
  desc:     'Revoke and reset the group invite link',
  category: 'group',
  react:    '🔗',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, isBotAdmins, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  if (!isBotAdmins) return reply('❌ I need to be an admin.');
  try {
    await conn.groupRevokeInvite(from);
    const newCode = await conn.groupInviteCode(from);
    await conn.sendMessage(from, {
      text: `✅ *Invite link revoked!*\n\nNew link:\nhttps://chat.whatsapp.com/${newCode}`
    }, { quoted: mek });
  } catch { reply('❌ Failed to revoke link.'); }
});

// ── ephemeral2 ────────────────────────────────────────────────────────
// Renamed to ephemeral2 to avoid conflict with updates.js ephemeral command
cmd({
  pattern:  'ephemeral2',
  alias:    ['disappear2'],
  desc:     'Set disappearing messages: ephemeral2 off|24h|7d|90d',
  category: 'group',
  react:    '⏱️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, isBotAdmins, args, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  if (!isBotAdmins) return reply('❌ I need to be an admin.');
  const opts = { off: 0, '24h': 86400, '7d': 604800, '90d': 7776000 };
  const key  = (args[0] || '').toLowerCase();
  if (!key || !(key in opts)) return reply('❗ Usage: ephemeral2 off|24h|7d|90d');
  try {
    await conn.groupToggleEphemeral(from, opts[key]);
    reply(`✅ Disappearing messages: *${key === 'off' ? 'OFF' : key}*`);
  } catch { reply('❌ Failed to set disappearing messages.'); }
});

// ── kickall ───────────────────────────────────────────────────────────
cmd({
  pattern:  'kickall',
  alias:    ['removemembers'],
  desc:     'Kick all non-admin members (admin only)',
  category: 'group',
  react:    '🦾',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, isBotAdmins, participants, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  if (!isBotAdmins) return reply('❌ I need to be an admin.');
  const botId     = conn.user.id.split(':')[0] + '@s.whatsapp.net';
  const nonAdmins = (participants || []).filter(p => !p.admin && p.id !== botId);
  if (!nonAdmins.length) return reply('✅ No non-admin members to remove.');
  await conn.sendMessage(from, {
    text: `⏳ Kicking ${nonAdmins.length} members...`
  }, { quoted: mek });
  let kicked = 0;
  for (const p of nonAdmins) {
    try { await conn.groupParticipantsUpdate(from, [p.id], 'remove'); kicked++; } catch {}
    await new Promise(r => setTimeout(r, 600));
  }
  reply(`✅ Kicked *${kicked}/${nonAdmins.length}* members.`);
});
