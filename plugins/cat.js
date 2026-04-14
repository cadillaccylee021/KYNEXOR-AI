// plugins/cat.js — :cat  (random cat image)
'use strict';

const { cmd } = require('../command');

cmd({
  pattern:  'cat',
  alias:    ['kitty', 'meow'],
  desc:     'Send a random cat image 🐈',
  category: 'misc',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    await conn.sendMessage(from, {
      image:   { url: 'https://cataas.com/cat' },
      caption: '*meow meow 🐈*',
    }, { quoted: mek });
  } catch (e) {
    reply('An error occurred: ' + e.message);
  }
});
