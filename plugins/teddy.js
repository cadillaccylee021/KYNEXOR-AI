'use strict';
const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

cmd({
  pattern: 'teddy',
  desc: 'Cute teddy bear animation with hearts',
  category: 'fun',
  filename: __filename
}, async (conn, mek, m, { from }) => {
  try {
    const hearts = ['❤', '💕', '😻', '🧡', '💛', '💚', '💙', '💜', '🖤', '❣', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥', '💌', '🙂', '🤗', '😌', '😉', '😊', '🎊', '🎉', '🎁', '🎈'];
    const sent = await conn.sendMessage(from, { text: `(\\_/)\n( •.•)\n/>🤍` }, { quoted: mek });
    for (const heart of hearts) {
      await sleep(500);
      await conn.sendMessage(from, { text: `(\\_/)\n( •.•)\n/>${heart}`, edit: sent.key });
    }
  } catch (e) {
    await conn.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: mek });
  }
});
