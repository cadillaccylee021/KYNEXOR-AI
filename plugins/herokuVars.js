'use strict';
const { cmd } = require('../command');
const fetch = require('node-fetch');
const config = require('../config');

const appName   = (config.HEROKU_APP_NAME || '').toLowerCase();
const authToken = config.HEROKU_API_KEY   || '';
const HEROKU    = !!(authToken && appName);
const P = config.PREFIX || '/';

const herokuHeaders = {
  Accept: 'application/vnd.heroku+json; version=3',
  Authorization: `Bearer ${authToken}`,
  'Content-Type': 'application/json'
};

const hFetch = (method, body) =>
  fetch(`https://api.heroku.com/apps/${appName}/config-vars`, {
    method,
    headers: herokuHeaders,
    ...(body ? { body: JSON.stringify(body) } : {})
  });

// ── heroku var commands (only registered if HEROKU creds exist) ───────
if (HEROKU) {
  cmd({ pattern: 'allvar', alias: ['getallvar'], desc: 'Get all Heroku vars', category: 'admin', fromMe: true, filename: __filename },
  async (conn, mek, m, { from, reply }) => {
    try {
      const res = await hFetch('GET');
      if (!res.ok) return reply('*Failed to reach Heroku. Check HEROKU_APP_NAME & HEROKU_API_KEY.*');
      const vars = await res.json();
      let txt = `*${appName} — Heroku Vars*\n\n`;
      Object.entries(vars).forEach(([k, v]) => { txt += `*${k}:* \`${v || ''}\`\n`; });
      await conn.sendMessage(from, { text: txt }, { quoted: mek });
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });

  cmd({ pattern: 'newvar', alias: ['addvar'], desc: 'Add a Heroku var (KEY:value)', category: 'admin', fromMe: true, filename: __filename },
  async (conn, mek, m, { q, reply }) => {
    try {
      if (!q || !q.includes(':')) return reply(`*Example:* ${P}newvar MODE:public`);
      const idx  = q.indexOf(':');
      const key  = q.slice(0, idx).toUpperCase().trim();
      const val  = q.slice(idx + 1).trim();
      const res  = await hFetch('PATCH', { [key]: val });
      if (res.ok) reply(`✅ *${key}* set to \`${val}\``);
      else reply('*Failed to set var.*');
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });

  cmd({ pattern: 'setvar', desc: 'Update an existing Heroku var (KEY:value)', category: 'admin', fromMe: true, filename: __filename },
  async (conn, mek, m, { q, reply }) => {
    try {
      if (!q || !q.includes(':')) return reply(`*Example:* ${P}setvar PREFIX:/`);
      const idx  = q.indexOf(':');
      const key  = q.slice(0, idx).toUpperCase().trim();
      const val  = q.slice(idx + 1).trim();
      const res  = await hFetch('PATCH', { [key]: val });
      if (res.ok) reply(`✅ *${key}* updated to \`${val}\``);
      else reply('*Failed to update var.*');
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });

  cmd({ pattern: 'getvar', desc: 'Get a specific Heroku var', category: 'admin', fromMe: true, filename: __filename },
  async (conn, mek, m, { q, reply }) => {
    try {
      if (!q) return reply(`*Example:* ${P}getvar PREFIX`);
      const res  = await hFetch('GET');
      if (!res.ok) return reply('*Failed to reach Heroku.*');
      const vars = await res.json();
      const key  = q.toUpperCase().trim();
      if (!(key in vars)) return reply(`*${key}* does not exist in the app vars.`);
      reply(`*${key}:* \`${vars[key]}\``);
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });
}
