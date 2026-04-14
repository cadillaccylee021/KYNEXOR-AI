// plugins/antitag.js — Anti-tag (tagall/hidetag) protection
'use strict';
const { cmd }            = require('../command');
const { getGroupSettings, setGroupSetting } = require('../lib/botdb');

cmd({
  pattern: 'antitag',
  alias: ['antimention', 'at'],
  desc: 'Configure anti-tag protection (tagall/hidetag)',
  category: 'admin',
  filename: __filename,
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, args, reply }) => {
  if (!isGroup)    return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('🚫 Admins only.');

  const settings = getGroupSettings(from);
  const status   = settings.antitag     ? 'ON'     : 'OFF';
  const action   = settings.antitag_action || 'delete';
  const opt      = args[0]?.toLowerCase();

  if (!opt) {
    return reply(
      `📛 Anti-tag is *${status}* (action: *${action}*).\n\n` +
      'Usage:\n' +
      '  :antitag on\n' +
      '  :antitag off\n' +
      '  :antitag set delete\n' +
      '  :antitag set kick\n' +
      '  :antitag get'
    );
  }

  if (opt === 'on') {
    if (settings.antitag) return reply('ℹ️ Anti-tag is already ON.');
    setGroupSetting(from, 'antitag', 1);
    return reply('✅ Anti-tag turned *ON*.');
  }

  if (opt === 'off') {
    setGroupSetting(from, 'antitag', 0);
    return reply('✅ Anti-tag turned *OFF*.');
  }

  if (opt === 'set') {
    const act = args[1]?.toLowerCase();
    if (!act || !['delete', 'kick'].includes(act))
      return reply('❌ Use: :antitag set delete OR :antitag set kick');
    setGroupSetting(from, 'antitag_action', act);
    setGroupSetting(from, 'antitag', 1);
    return reply(`✅ Anti-tag action set to *${act}* and enabled.`);
  }

  if (opt === 'get') {
    const s = getGroupSettings(from);
    return reply(`📋 *Anti-tag Config*\nStatus: ${s.antitag ? 'ON' : 'OFF'}\nAction: ${s.antitag_action || 'delete'}`);
  }

  return reply('❓ Unknown option. Use :antitag for help.');
});