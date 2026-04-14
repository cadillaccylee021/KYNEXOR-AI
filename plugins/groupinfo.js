// plugins/groupinfo.js — Show group information
'use strict';
const { cmd } = require('../command');

cmd({
  pattern: 'groupinfo',
  alias: ['ginfo', 'grpinfo'],
  desc: 'Show group information',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, isGroup, groupMetadata, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  try {
    const meta   = groupMetadata;
    const admins = meta.participants.filter(p => p.admin);
    let text = `📋 *GROUP INFORMATION*\n\n`;
    text += `🏷️ Name: ${meta.subject}\n`;
    text += `🆔 ID: ${meta.id}\n`;
    text += `👥 Members: ${meta.participants.length}\n`;
    text += `👑 Admins: ${admins.length}\n`;
    text += `📝 Description: ${meta.desc || 'No description'}\n`;
    text += `🔒 Restricted: ${meta.restrict ? 'Yes' : 'No'}\n`;
    text += `📢 Announce: ${meta.announce ? 'Yes' : 'No'}\n`;
    text += `📅 Created: ${new Date(meta.creation * 1000).toLocaleDateString()}\n\n`;
    text += `👑 *Admins:*\n`;
    admins.forEach((a, i) => { text += `${i+1}. @${a.id.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: mek });
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
