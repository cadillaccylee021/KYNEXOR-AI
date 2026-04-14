'use strict';
const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

cmd({
  pattern: 'hack',
  desc: 'Hacking prank animation',
  category: 'fun',
  react: '💀',
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const messages = [
      '🔍 *Kylie Injecting Malware...*',
      '▓░░░░░░░░░  10%',
      '▓▓░░░░░░░░  20%',
      '▓▓▓░░░░░░░  30%',
      '▓▓▓▓░░░░░░  40%',
      '▓▓▓▓▓░░░░░  50%',
      '▓▓▓▓▓▓░░░░  60%',
      '▓▓▓▓▓▓▓░░░  70%',
      '▓▓▓▓▓▓▓▓░░  80%',
      '▓▓▓▓▓▓▓▓▓░  90%',
      '▓▓▓▓▓▓▓▓▓▓  100%',
      '⚙️ *System hijacking in progress...*\n🔗 Connecting to server... Error 404',
      '✅ *Device successfully connected...*\n📥 Receiving data...',
      '💾 *Data hijacked from device 100% completed*\n🧹 Killing all evidence...',
      '💥 *HACKING COMPLETED*',
      '📤 *SENDING LOG DOCUMENTS...*',
      '✔️ *SUCCESSFULLY SENT DATA. Connection disconnected.*',
      '🗑️ *BACKLOGS CLEARED*'
    ];
    const sent = await conn.sendMessage(from, { text: messages[0] }, { quoted: mek });
    for (let i = 1; i < messages.length; i++) {
      await sleep(1000);
      await conn.sendMessage(from, {
        text: messages[i],
        edit: sent.key
      });
    }
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
