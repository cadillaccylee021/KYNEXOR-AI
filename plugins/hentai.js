'use strict';
const { cmd } = require('../command');
const fetch = require('node-fetch');
const axios = require('axios');
const config = require('../config');

const caption = `_${config.BOT_NAME || 'QUEEN_KYLIE'}_`;

// ── helper ────────────────────────────────────────────────────────────
const nsfwImg = (pattern, endpoint, desc) => {
  cmd({ pattern, desc, category: 'nsfw', filename: __filename },
  async (conn, mek, m, { from, reply }) => {
    try {
      const res  = await fetch(`https://api.maher-zubair.tech/nsfw/${endpoint}`);
      const data = await res.json();
      if (data.status === 200 && data.url) {
        await conn.sendMessage(from, { image: { url: data.url }, caption }, { quoted: mek });
      } else {
        reply('*_Request failed, try again!_*');
      }
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });
};

// ── commands ──────────────────────────────────────────────────────────
nsfwImg('pussy',      'pussy',     'NSFW image');
nsfwImg('ass',        'ass',       'NSFW image');
nsfwImg('boobs',      'boobs',     'NSFW image');
nsfwImg('yuri',       'yuri',      'NSFW image');
nsfwImg('dick',       'dick',      'NSFW image');
nsfwImg('hentailesb', 'lesbian',   'NSFW image');
nsfwImg('blowjob',    'blowjob',   'NSFW image');
nsfwImg('bdsm',       'bdsm',      'NSFW image');
nsfwImg('fuck',       'fuck',      'NSFW image');
nsfwImg('fingering',  'fingering', 'NSFW image');

// nsfw waifu (waifu.pics)
cmd({ pattern: 'nwaifu', desc: 'NSFW waifu image', category: 'nsfw', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const res = await fetch('https://waifu.pics/api/nsfw/waifu');
    const data = await res.json();
    if (data.url) {
      await conn.sendMessage(from, { image: { url: data.url }, caption }, { quoted: mek });
    } else reply('*_Could not fetch waifu image!_*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// nai — AI nsfw image generation
cmd({ pattern: 'nai', desc: 'Generate AI NSFW image', category: 'nsfw', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(`*Example:* ${config.PREFIX || '/'}nai anime girl`);
    await conn.sendMessage(from, { text: '⏳ *Generating image...*' }, { quoted: mek });
    const res = await fetch(`https://api.maher-zubair.tech/nsfw/x-gen?q=${encodeURIComponent(q)}`);
    if (!res.ok) return reply(`*Error: ${res.status} ${res.statusText}*`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.startsWith('image')) {
      await conn.sendMessage(from, { image: { url: res.url }, caption }, { quoted: mek });
    } else {
      const data = await res.json();
      if (data.result) {
        await conn.sendMessage(from, { image: { url: data.result }, caption }, { quoted: mek });
      } else reply('*_Failed to generate image!_*');
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
