// plugins/delspam.js — delete messages of a specific user from group chat
'use strict';

const { cmd } = require('../command');

cmd({
  pattern:  'delspam',
  alias:    ['dlspam'],
  desc:     'Delete last N messages of a replied/mentioned user from the group',
  category: 'admin',
  use:      '<count> (reply or @mention user)',
  filename: __filename,
}, async (conn, mek, m, { from, isGroup, isAdmin, isOwner, args }) => {
  const send = async (text, mentions = []) => {
    await conn.sendMessage(from, { text, mentions }, { quoted: mek });
  };

  try {
    if (!isGroup)             return send('*This command is for groups only!*');
    if (!isAdmin && !isOwner) return send('*You need to be an admin to use this!*');

    // Extract mentioned JIDs directly from the message (not passed by index)
    const mentionedJid =
      mek.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
      mek.message?.imageMessage?.contextInfo?.mentionedJid ||
      mek.message?.videoMessage?.contextInfo?.mentionedJid ||
      [];

    // Resolve target: quoted sender OR first @mention
    const ctx    = mek.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.participant || mentionedJid?.[0] || null;
    if (!target) return send('*Please reply to a message or @mention a user!*\nExample: :delspam 5 @user');

    // Count is required
    const count = parseInt(args?.[0]);
    if (!count || isNaN(count) || count < 1) return send('*Please specify how many messages to delete.*\nExample: :delspam 10 @user');
    const limit = Math.min(count, 50);

    const targetNum = target.split('@')[0];

    // Pull messages from store
    const { store } = require('../index');
    const chatMsgs = store?.messages?.[from];
    if (!chatMsgs || Object.keys(chatMsgs).length === 0) {
      return send('*No stored messages found for this chat.*\n_Messages are stored after the bot processes them._');
    }

    // Filter messages belonging to target user
    const userMsgs = Object.values(chatMsgs).filter(msg => {
      const participant = msg?.key?.participant || msg?.key?.remoteJid || '';
      return participant.includes(targetNum);
    });

    if (userMsgs.length === 0) {
      return send(`*No recent messages found from @${targetNum}*`, [target]);
    }

    // Sort by timestamp descending, take `limit`
    const toDelete = userMsgs
      .sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0))
      .slice(0, limit);

    await send(`_Deleting *${toDelete.length}* message(s) from @${targetNum}..._`, [target]);

    let deleted = 0;
    for (const msg of toDelete) {
      try {
        await conn.sendMessage(from, { delete: msg.key });
        deleted++;
        await new Promise(r => setTimeout(r, 350));
      } catch {}
    }

    await send(`✅ Deleted *${deleted}* message(s) from @${targetNum}.`, [target]);
  } catch (e) {
    console.error('[delspam]', e);
    await conn.sendMessage(from, { text: 'Error: ' + e.message }, { quoted: mek });
  }
});
