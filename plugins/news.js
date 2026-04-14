'use strict';
const { cmd } = require('../command');
const fetch = require('node-fetch');
const axios = require('axios');

// ── wanews ────────────────────────────────────────────────────────────
cmd({ pattern: 'wanews', alias: ['wa'], desc: 'Latest WhatsApp beta news', category: 'news', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const res = await fetch('https://api.maher-zubair.tech/details/wabetainfo');
    const data = await res.json();
    if (!data?.result) return reply('*Failed to fetch WhatsApp news.*');
    const { title, subtitle, date, link, desc } = data.result;
    await conn.sendMessage(from, {
      text: `*${title}*\n\n${subtitle}\n📅 ${date}\n\n${desc}\n\n🔗 ${link}`
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── technews ──────────────────────────────────────────────────────────
cmd({ pattern: 'technews', alias: ['tn'], desc: 'Latest tech news', category: 'news', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const { data } = await axios.get('https://api.maher-zubair.tech/details/tnews');
    if (!data?.result) return reply('*Failed to fetch tech news.*');
    const { title, link, img, desc } = data.result;
    await conn.sendMessage(from, {
      image: { url: img },
      caption: `*${title}*\n\n${desc}\n\n🔗 ${link}`
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── nasanews ──────────────────────────────────────────────────────────
cmd({ pattern: 'nasanews', desc: 'Latest NASA news/photo', category: 'news', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const { data } = await axios.get('https://api.maher-zubair.tech/details/nasa');
    const d = data.result;
    if (!d) return reply('*Failed to fetch NASA news.*');
    const msg = `🚀 *${d.title}*\n📅 *Date:* ${d.date}\n\n${d.explanation}\n\n🔗 ${d.url}\n📢 *Copyright:* ${d.copyright || 'N/A'}`;
    if (d.hdurl || d.url) {
      await conn.sendMessage(from, { image: { url: d.hdurl || d.url }, caption: msg }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── spacenews ─────────────────────────────────────────────────────────
cmd({ pattern: 'spacenews', desc: 'Space flight news', category: 'news', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const res = await fetch('https://api.spaceflightnewsapi.net/v4/articles/');
    const data = await res.json();
    if (!data?.results?.[0]) return reply('*Failed to fetch space news.*');
    const { title, url, image_url, summary, published_at } = data.results[0];
    const msg = `*${title}*\n\n${summary}\n\n📅 *Published:* ${published_at}\n🔗 ${url}`;
    if (image_url) {
      await conn.sendMessage(from, { image: { url: image_url }, caption: msg }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── population ────────────────────────────────────────────────────────
cmd({ pattern: 'population', desc: 'Current world population stats', category: 'news', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const res = await fetch('https://api.maher-zubair.tech/details/population');
    const data = await res.json();
    if (!data?.result) return reply('*Failed to fetch population data.*');
    const { current, today } = data.result;
    await conn.sendMessage(from, {
      text: `🌍 *World Population Stats*\n\n👥 *Total:* ${current.total}\n👨 *Male:* ${current.male}\n👩 *Female:* ${current.female}\n\n📊 *Today:*\n🍼 Births: ${today.births}\n⚰️ Deaths: ${today.deaths}`
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── animesearch ───────────────────────────────────────────────────────
cmd({ pattern: 'animesearch', desc: 'Search anime info', category: 'news', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide an anime title!*\nExample: /animesearch Naruto');
    const res = await fetch(`https://api.maher-zubair.tech/anime/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.status !== 200) return reply(`*Anime not found:* ${q}`);
    const a = data.result;
    const msg = `*${a.title.romaji}* (${a.title.english || a.title.native})\n\n📺 *Format:* ${a.format}\n📅 *Episodes:* ${a.episodes}\n⭐ *Score:* ${a.averageScore}/100\n📌 *Status:* ${a.status}\n🎭 *Genres:* ${(a.genres || []).join(', ')}\n\n${a.description?.replace(/<[^>]*>/g, '') || ''}`;
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
