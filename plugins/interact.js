'use strict';
const { cmd } = require('../command');
const config = require('../config');

cmd({
  pattern: 'hi',
  react: '👋',
  desc: 'Greet and introduce the bot',
  category: 'greeting',
  filename: __filename
}, async (conn, mek, m, { reply, pushname }) => {
  reply(`Hey ${pushname}! 👋 I'm *${config.BOT_NAME || 'QUEEN_KYLIE'}*, a multipurpose WhatsApp bot made with ❤️.\n\nType *${config.PREFIX || '/'}menu* to see all available commands!`);
});

cmd({
  pattern: 'cylee',
  react: '🤴',
  desc: 'Info about the bot owner',
  category: 'greeting',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  reply(`👑 *About the Owner*\n\nThe person you speak of is my master — a software developer and the creator of this bot.\n\nType *${config.PREFIX || '/'}owner* to get contact details.`);
});
