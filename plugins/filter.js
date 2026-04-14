// plugins/filter.js — Queen Kylie Bot
// Keyword auto-reply per group, with persistent JSON storage
'use strict';

const { cmd } = require('../command');
const fs   = require('fs');
const path = require('path');

const FILTER_FILE = path.join(__dirname, '../lib/filters.json');
function readF()  { try { return JSON.parse(fs.readFileSync(FILTER_FILE, 'utf8')); } catch { return {}; } }
function saveF(d) { fs.writeFileSync(FILTER_FILE, JSON.stringify(d, null, 2)); }
if (!fs.existsSync(FILTER_FILE)) saveF({});

// ── addfilter ─────────────────────────────────────────────────────────
cmd({
  pattern:  'addfilter',
  alias:    ['filter'],
  desc:     'Add keyword auto-reply: addfilter <keyword> | <response>',
  category: 'group',
  react:    '🔑',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, body, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');

  const text = (body || '').split(' ').slice(1).join(' ');
  const sep  = text.indexOf('|');
  if (sep === -1) return reply('❗ Usage: addfilter <keyword> | <response>');
  const keyword  = text.slice(0, sep).trim().toLowerCase();
  const response = text.slice(sep + 1).trim();
  if (!keyword || !response) return reply('❗ Both keyword and response are required.');

  const data = readF();
  if (!data[from]) data[from] = {};
  data[from][keyword] = response;
  saveF(data);
  reply(`✅ Filter added!\n🔑 *Keyword:* ${keyword}\n💬 *Response:* ${response.substring(0, 100)}`);
});

// ── removefilter ──────────────────────────────────────────────────────
cmd({
  pattern:  'removefilter',
  alias:    ['delfilter'],
  desc:     'Remove a keyword filter: removefilter <keyword>',
  category: 'group',
  react:    '🗑️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, body, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  const keyword = (body || '').split(' ').slice(1).join(' ').trim().toLowerCase();
  if (!keyword) return reply('❗ Usage: removefilter <keyword>');
  const data = readF();
  if (!data[from]?.[keyword]) return reply(`❌ No filter for keyword: *${keyword}*`);
  delete data[from][keyword];
  saveF(data);
  reply(`✅ Filter *${keyword}* removed.`);
});

// ── listfilters ───────────────────────────────────────────────────────
cmd({
  pattern:  'listfilters',
  alias:    ['filters'],
  desc:     'List all keyword filters in this group',
  category: 'group',
  react:    '📋',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  const data    = readF();
  const filters = data[from] || {};
  const keys    = Object.keys(filters);
  if (!keys.length) return reply('📭 No filters set.\nAdd one: *addfilter <keyword> | <response>*');
  const lines = keys.map((k, i) =>
    `${i + 1}. 🔑 *${k}*\n   → ${filters[k].substring(0, 80)}${filters[k].length > 80 ? '...' : ''}`
  );
  await conn.sendMessage(from, {
    text: `🔍 *Filters (${keys.length})*\n\n${lines.join('\n\n')}`
  }, { quoted: mek });
});

// ── clearfilters ──────────────────────────────────────────────────────
cmd({
  pattern:  'clearfilters',
  desc:     'Remove ALL keyword filters in this group (admin only)',
  category: 'group',
  react:    '🗑️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  const data  = readF();
  const count = Object.keys(data[from] || {}).length;
  if (!count) return reply('📭 No filters to clear.');
  delete data[from];
  saveF(data);
  reply(`🗑️ Cleared *${count}* filter${count > 1 ? 's' : ''}.`);
});

// ── LISTENER — registered from index.js ──────────────────────────────
function registerFilterListener(conn) {
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const mek of messages) {
      try {
        if (!mek.message || mek.key.fromMe) continue;
        const from = mek.key.remoteJid;
        if (!from?.endsWith('@g.us')) continue;
        const data    = readF();
        const filters = data[from];
        if (!filters || !Object.keys(filters).length) continue;
        const text = (
          mek.message?.conversation ||
          mek.message?.extendedTextMessage?.text ||
          mek.message?.imageMessage?.caption ||
          mek.message?.videoMessage?.caption || ''
        ).toLowerCase().trim();
        if (!text) continue;
        for (const [keyword, response] of Object.entries(filters)) {
          if (text.includes(keyword)) {
            await conn.sendMessage(from, { text: response }, { quoted: mek }).catch(() => {});
            break;
          }
        }
      } catch (e) { console.error('filter listener:', e.message); }
    }
  });
  console.log('✅ Filter listener registered.');
}

module.exports = { registerFilterListener };
