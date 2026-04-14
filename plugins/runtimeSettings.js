// plugins/runtimeSettings.js — Runtime settings stored in botdb key_value
'use strict';

const { cmd }                         = require('../command');
const { getBotSettings, saveBotSettings } = require('../lib/botdb');
const config                          = require('../config');

function applyToConfig(s) {
  if (!s || typeof s !== 'object') return;
  if (s.botName)     config.BOT_NAME      = s.botName;
  if (s.ownerName)   config.OWNER_NAME    = s.ownerName;
  if (s.ownerNumber) config.OWNER_NUMBER  = s.ownerNumber;
  if (s.prefix)      config.PREFIX        = s.prefix;
  if (s.mode)        config.MODE          = s.mode;
  if (s.aliveImg)    config.ALIVE_IMG     = s.aliveImg;
  if (s.aliveMsg)    config.ALIVE_MSG     = s.aliveMsg;
}

// Apply on load
applyToConfig(getBotSettings());

function ownerOnly(reply, isOwner) {
  if (!isOwner) { reply('Owner only.'); return false; }
  return true;
}

cmd({ pattern:'setbotname',    desc:'Set bot name',          category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const name = args.join(' ').trim();
  if (!name) return reply('Usage: setbotname MyBot');
  const s = getBotSettings(); s.botName = name; saveBotSettings(s); applyToConfig(s);
  return reply(`✅ Bot name: ${name}`);
});

cmd({ pattern:'setownername',  desc:'Set owner name',        category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const name = args.join(' ').trim();
  if (!name) return reply('Usage: setownername MyName');
  const s = getBotSettings(); s.ownerName = name; saveBotSettings(s); applyToConfig(s);
  return reply(`✅ Owner name: ${name}`);
});

cmd({ pattern:'setownernumber', desc:'Set owner number',     category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const num = (args[0]||'').replace(/\D/g,'');
  if (!num) return reply('Usage: setownernumber 2348012345678');
  const s = getBotSettings(); s.ownerNumber = num; saveBotSettings(s); applyToConfig(s);
  return reply(`✅ Owner number: ${num}`);
});

cmd({ pattern:'setprefix',     desc:'Set command prefix',    category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const p = args[0];
  if (!p) return reply('Usage: setprefix .');
  const s = getBotSettings(); s.prefix = p; saveBotSettings(s); applyToConfig(s);
  return reply(`✅ Prefix: ${p}`);
});

cmd({ pattern:'setalivemsg',   desc:'Set alive message',     category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const txt = args.join(' ').trim();
  if (!txt) return reply('Usage: setalivemsg Your message...');
  const s = getBotSettings(); s.aliveMsg = txt; saveBotSettings(s); applyToConfig(s);
  return reply('✅ Alive message saved.');
});

cmd({ pattern:'setaliveimg',   desc:'Set alive image URL',   category:'settings', filename:__filename },
async (conn,mek,m,{args,isOwner,reply}) => {
  if (!ownerOnly(reply,isOwner)) return;
  const url = args[0];
  if (!url) return reply('Usage: setaliveimg https://...');
  const s = getBotSettings(); s.aliveImg = url; saveBotSettings(s); applyToConfig(s);
  return reply('✅ Alive image saved.');
});

cmd({ pattern:'getsettings',   desc:'Show runtime settings', category:'settings', filename:__filename },
async (conn,mek,m,{isOwner,reply}) => {
  if (!isOwner) return reply('Owner only.');
  const s = getBotSettings();
  return reply('Runtime settings:\n```' + JSON.stringify(s,null,2) + '```');
});

cmd({ pattern:'resetsettings', desc:'Reset runtime settings',category:'settings', filename:__filename },
async (conn,mek,m,{isOwner,reply}) => {
  if (!isOwner) return reply('Owner only.');
  saveBotSettings({});
  return reply('✅ Runtime settings reset.');
});

module.exports = { getBotSettings, saveBotSettings, applyToConfig };
