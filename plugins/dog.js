// plugins/dog.js
'use strict';

const fetch  = require('node-fetch');
const { cmd } = require('../command');

cmd({
  pattern:  'dog',
  desc:     'Send a random dog video/image',
  category: 'misc',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    const res  = await fetch('https://random.dog/woof.json');
    const json = await res.json();
    if (!json?.url) return reply('*Could not fetch a dog, try again!*');

    const url = json.url;
    const isVideo = /\.(mp4|webm)$/i.test(url);

    if (isVideo) {
      await conn.sendMessage(from, { video: { url }, caption: '🐶' }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { image: { url }, caption: '🐶' }, { quoted: mek });
    }
  } catch (e) {
    reply('Error: ' + e.message);
  }
});
