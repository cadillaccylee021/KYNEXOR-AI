// plugins/ssweb.js — Screenshot a website
'use strict';
const { cmd }  = require('../command');
const APIs     = require('../lib/apiUtils');

cmd({
  pattern: 'ssweb',
  alias: ['screenshot', 'ss', 'webss'],
  desc: 'Take a screenshot of a website',
  category: 'tools',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  if (!args.length) return reply('❌ Provide a URL!\nExample: :ssweb https://github.com');
  const url = args.join(' ');
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    return reply('❌ URL must start with http:// or https://');

  await conn.sendMessage(from, { react: { text: '📸', key: mek.key } });
  try {
    const buf = await APIs.screenshotWebsite(url);
    await conn.sendMessage(from, { image: buf }, { quoted: mek });
  } catch (e) {
    reply(`❌ Screenshot failed: ${e.message}`);
  }
});
