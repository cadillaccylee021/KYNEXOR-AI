// plugins/translate.js — Translate text to another language
'use strict';
const { cmd }  = require('../command');
const APIs     = require('../lib/apiUtils');

cmd({
  pattern: 'translate',
  alias: ['tr', 'trans'],
  desc: 'Translate text to another language',
  category: 'tools',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  if (args.length < 2) return reply('❌ Usage: :translate <lang> <text>\nExample: :translate es Hello world\n\nCodes: en, es, fr, de, it, pt, ru, ja, ko, zh');
  const lang = args[0];
  const text = args.slice(1).join(' ');
  try {
    const result = await APIs.translate(text, lang);
    const translated = result?.data?.translatedText || result?.translation || result;
    await reply(`🌐 *Translation*\n\n📝 Original: ${text}\n🔤 Translated: ${translated}\n🌍 Language: ${lang.toUpperCase()}`);
  } catch (e) {
    reply(`❌ Translation failed: ${e.message}`);
  }
});
