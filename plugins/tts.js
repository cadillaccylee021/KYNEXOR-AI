// plugins/tts.js — Text to speech
'use strict';
const axios  = require('axios');
const { cmd } = require('../command');
const APIs    = require('../lib/apiUtils');

cmd({
  pattern: 'tts',
  alias: ['speak', 'say'],
  desc: 'Convert text to speech',
  category: 'tools',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  const text = args.join(' ').trim();
  if (!text) return reply('❌ Provide text!\nExample: :tts hello how are you');
  try {
    const audioUrl = await APIs.textToSpeech(text);
    const res      = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
    await conn.sendMessage(from, { audio: Buffer.from(res.data), mimetype: 'audio/mp3', ptt: true }, { quoted: mek });
  } catch (e) {
    console.error('tts error:', e);
    reply(`❌ Failed to generate speech: ${e.message}`);
  }
});
