// plugins/autoreact.js — areact command + exports for index.js inline handler
'use strict';
const path = require('path');
const fs   = require('fs');
const { cmd } = require('../command');

const SETTINGS_FILE = path.join(__dirname, '../lib/autoreact.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {}
  return {};
}
function saveSettings(data) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('autoreact saveSettings error:', e.message); }
}

const settings = loadSettings();

function getAutoReact(botNumber) {
  return settings[String(botNumber)] || 'false';
}
function setAutoReact(botNumber, val) {
  settings[String(botNumber)] = val;
  saveSettings(settings);
}

const emojis = ['❤','💕','😻','🧡','💛','💚','💙','💜','🖤','❣','💞','💓','💗','💖','💘','💝','💟','♥','💌','🙂','🤗','😌','😉','😊','🎊','🎉','🎁','🎈','👋'];
const mojis  = ['💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💯','🔥','💥','✨','🌟','⭐️','🎵','🎶','🎊','🎉','🎈','🎁','🏆️','🥇','👑','💎','🌈','🦋','🌸','💐','🌺','🌻','🌹','🍀','☘️','🌙','⚡️','❄️','🔮','🎯','🎲','🎮️','🚀','🌌','💫','🪐'];

// ── :areact command ───────────────────────────────────────────────────────────
cmd({
  pattern: 'areact',
  alias: ['autoreaction', 'autoreact'],
  desc: 'Enable/disable auto reaction on messages',
  category: 'tools',
  use: '<on | cmd | all | off>',
  filename: __filename,
}, async (conn, mek, m, { from, q, botNumber, reply }) => {
  const cur = getAutoReact(botNumber);
  const arg = q ? q.toLowerCase().trim() : '';

  if (!arg) {
    const statusMap = { 'true': 'ON (commands only)', 'cmd': 'ON (commands only)', 'all': 'ON (all messages)', 'false': 'OFF ❌' };
    return reply(
      `*Auto Reaction:* ${statusMap[cur] || 'OFF ❌'}\n\n` +
      `:areact on  → react to commands only\n` +
      `:areact all → react to every message\n` +
      `:areact off → disable`
    );
  }

  const action =
    ['on', 'act', 'true', 'enable'].some(k => arg.includes(k)) ? 'true' :
    arg.includes('cmd')  ? 'cmd'  :
    arg.includes('all')  ? 'all'  :
    ['off', 'disable', 'deact', 'false'].some(k => arg.includes(k)) ? 'false' : null;

  if (!action) return reply('*Use: on / cmd / all / off*');
  if (cur === action) return reply(`*Already ${action === 'false' ? 'disabled' : 'set to ' + action}!*`);

  setAutoReact(botNumber, action);

  const msgs = {
    'true':  '✅ *Auto Reaction ON* — reacting to commands',
    'cmd':   '✅ *Auto Reaction ON* — reacting to commands',
    'all':   '✅ *Auto Reaction ON* — reacting to ALL messages',
    'false': '✅ *Auto Reaction OFF*',
  };
  reply(msgs[action]);
});

module.exports = { getAutoReact, emojis, mojis };
