// plugins/notes.js — Queen Kylie Bot
// Per-group saved notes with persistent JSON storage
'use strict';

const { cmd } = require('../command');
const fs   = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '../lib/notes.json');
function readN()  { try { return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')); } catch { return {}; } }
function saveN(d) { fs.writeFileSync(NOTES_FILE, JSON.stringify(d, null, 2)); }
if (!fs.existsSync(NOTES_FILE)) saveN({});

// ── savenote ──────────────────────────────────────────────────────────
cmd({
  pattern:  'savenote',
  alias:    ['note', 'addnote'],
  desc:     'Save a note: savenote <name> | <content>',
  category: 'group',
  react:    '📝',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, body, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  const text = (body || '').split(' ').slice(1).join(' ');
  const sep  = text.indexOf('|');
  if (sep === -1) return reply('❗ Usage: savenote <name> | <content>\nExample: savenote rules | Be respectful, no spam.');
  const name    = text.slice(0, sep).trim().toLowerCase().replace(/\s+/g, '_');
  const content = text.slice(sep + 1).trim();
  if (!name || !content) return reply('❗ Both a name and content are required.');
  const notes = readN();
  if (!notes[from]) notes[from] = {};
  notes[from][name] = { content, savedAt: Date.now() };
  saveN(notes);
  reply(`📝 Note *${name}* saved!\nGet it with: *getnote ${name}*`);
});

// ── getnote ───────────────────────────────────────────────────────────
cmd({
  pattern:  'getnote',
  alias:    ['#'],
  desc:     'Get a saved note: getnote <name>',
  category: 'group',
  react:    '📌',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, q, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  const name = (q || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!name) return reply('❗ Usage: getnote <name>\nSee all: *listnotes*');
  const notes = readN();
  const note  = notes[from]?.[name];
  if (!note) return reply(`❌ Note *${name}* not found.\nSee all with: *listnotes*`);
  const age = Math.floor((Date.now() - note.savedAt) / 86400000);
  await conn.sendMessage(from, {
    text: `📌 *${name}*\n\n${note.content}\n\n_Saved ${age === 0 ? 'today' : `${age} day${age > 1 ? 's' : ''} ago`}_`
  }, { quoted: mek });
});

// ── listnotes ─────────────────────────────────────────────────────────
cmd({
  pattern:  'listnotes',
  alias:    ['notes', 'notelist'],
  desc:     'List all notes saved in this group',
  category: 'group',
  react:    '📒',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  const notes    = readN();
  const grpNotes = notes[from] || {};
  const keys     = Object.keys(grpNotes);
  if (!keys.length) return reply('📭 No notes saved yet.\nAdd one: *savenote <name> | <content>*');
  const lines = keys.map((k, i) => {
    const preview = grpNotes[k].content.substring(0, 60) + (grpNotes[k].content.length > 60 ? '...' : '');
    return `${i + 1}. 📌 *${k}*\n   ${preview}`;
  });
  await conn.sendMessage(from, {
    text: `📒 *Notes (${keys.length})*\n\n${lines.join('\n\n')}\n\n_Use *getnote <name>* to read_`
  }, { quoted: mek });
});

// ── delnote ───────────────────────────────────────────────────────────
cmd({
  pattern:  'delnote',
  alias:    ['deletenote'],
  desc:     'Delete a note (admin): delnote <name>',
  category: 'group',
  react:    '🗑️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, q, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  const name = (q || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!name) return reply('❗ Usage: delnote <name>');
  const notes = readN();
  if (!notes[from]?.[name]) return reply(`❌ Note *${name}* not found.`);
  delete notes[from][name];
  saveN(notes);
  reply(`✅ Note *${name}* deleted.`);
});

// ── clearnotes ────────────────────────────────────────────────────────
cmd({
  pattern:  'clearnotes',
  desc:     'Delete ALL notes in this group (admin only)',
  category: 'group',
  react:    '🗑️',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, isSudo, reply }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');
  const notes = readN();
  const count = Object.keys(notes[from] || {}).length;
  if (!count) return reply('📭 No notes to clear.');
  delete notes[from];
  saveN(notes);
  reply(`🗑️ Cleared *${count}* note${count > 1 ? 's' : ''}.`);
});
