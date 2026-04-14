// plugins/anticall.js — anticall command + call listener
// In index.js, inside the 'connection open' block add:
//   const { registerAntiCall } = require('./plugins/anticall');
//   registerAntiCall(conn);
'use strict';
const fs  = require('fs');
const { cmd } = require('../command');

const SETTINGS_FILE = './lib/anticall.json';
const ANTICALL_MSG  =
  '```Hii.... this is Anthony!!\n\n' +
  '\tSorry for now, I cannot receive calls, whether in a group or personal\n\n' +
  ' if you need help or need to pass information  please drop a message I will  reply when i come online \n\n\n' +
  'Powered by Me```';

// ── Persistence helpers ───────────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {}
  return {};
}
function saveSettings(data) {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2)); } catch (e) {}
}

// { botNumber: 'all' | '212,91' | 'false' }
const settings = loadSettings();
const warnMap  = {}; // { callerJid: { warn: N } }

// ── ANTICALL command ──────────────────────────────────────────────────────────
cmd({
  pattern: 'anticall',
  alias: ['callblock', 'blockcall'],
  desc: 'Configure anticall — block all calls or by country code',
  category: 'owner',
  use: '<all | 212,91 | off>',
  filename: __filename,
}, async (conn, mek, m, { from, q, botNumber, isOwner, reply }) => {
  if (!isOwner) return reply('🚫 Owner only.');

  const key = botNumber;
  const cur = settings[key] || 'false';
  const arg = q ? q.toLowerCase().trim() : '';

  // Turn off
  if (arg === 'off' || arg === 'deact' || arg === 'disable') {
    if (cur === 'false') return reply('*AntiCall is already disabled!*');
    settings[key] = 'false';
    saveSettings(settings);
    return reply('*✅ AntiCall disabled successfully!*');
  }

  // Show current status
  if (!arg) {
    const status = cur === 'false' ? 'Not set / Disabled' : `Active — blocking: *${cur}*`;
    return reply(`*AntiCall Status:* ${status}\n\n*Usage:*\n:anticall all → block all calls\n:anticall 212,91 → block by country code\n:anticall off → disable`);
  }

  // Set to all
  if (arg === 'all') {
    settings[key] = 'all';
    saveSettings(settings);
    return reply('*✅ AntiCall set to block ALL calls!*');
  }

  // Set country codes
  const codes = arg.split(',').map(c => parseInt(c.trim())).filter(n => !isNaN(n));
  if (!codes.length) return reply('*❌ Invalid country codes.*\nExample: :anticall 212,91,231');
  settings[key] = codes.join(',');
  saveSettings(settings);
  reply(`*✅ AntiCall set — blocking calls from country codes: ${settings[key]}*`);
});

// ── registerAntiCall — hook call events ───────────────────────────────────────
function registerAntiCall(conn) {
  conn.ev.on('call', async (calls) => {
    for (const call of calls) {
      try {
        if (call.status !== 'offer') continue;

        const botNumber = conn.user.id.split(':')[0];
        const setting   = settings[botNumber] || 'false';
        if (setting === 'false') continue;

        // Check if caller matches country code filter or setting is 'all'
        const caller = call.from || '';
        let shouldBlock = false;

        if (setting === 'all') {
          shouldBlock = true;
        } else {
          const codes = setting.split(',').map(c => c.trim());
          shouldBlock = codes.some(code => caller.startsWith(code));
        }

        if (!shouldBlock) continue;

        // Decline the call
        await conn.rejectCall(call.id, call.from);

        // Track warns
        if (!warnMap[caller]) warnMap[caller] = { warn: 0 };
        if (warnMap[caller].warn < 2) {
          await conn.sendMessage(caller, { text: ANTICALL_MSG });
        }
        warnMap[caller].warn++;

        await conn.sendMessage(caller, {
          text: `*_${warnMap[caller].warn} Call rejected from @${caller.split('@')[0]}..!!_*`,
          mentions: [caller]
        });

      } catch (e) {
        console.error('anticall error:', e.message);
      }
    }
  });
  console.log('✅ AntiCall listener registered');
}

module.exports = { registerAntiCall };
