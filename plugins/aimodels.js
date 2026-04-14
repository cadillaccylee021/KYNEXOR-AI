// plugins/ai.js — gpt, bing, lumine, gemini, davinci, simisi, dalle, sd, rmbg, blackbox, remini, dehaze, recolor
'use strict';
const axios  = require('axios');
const fetch  = require('node-fetch');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper — fetch image from URL into buffer and send
// ─────────────────────────────────────────────────────────────────────────────
async function sendImageFromUrl(conn, from, mek, url, caption) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  await conn.sendMessage(from, { image: Buffer.from(res.data), caption }, { quoted: mek });
}

// Shared helper — call AI text API, send thinking msg, send result
async function aiTextCmd(conn, mek, from, q, apiUrl, resultKey = 'result') {
  if (!q) return;
  await conn.sendMessage(from, { text: '_kylie is thinking, hold on... 🤔_' }, { quoted: mek });
  await new Promise(r => setTimeout(r, 1000));
  const res  = await fetch(apiUrl, { timeout: 30000 });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const text = data[resultKey] || data.message || data.response || data.text || JSON.stringify(data);
  await conn.sendMessage(from, { text: `*Response:*\n\n${text}` }, { quoted: mek });
}

// Shared helper — handle image response from API (direct image or JSON with URL)
async function handleImageResponse(conn, from, mek, response, caption) {
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const ct = response.headers.get('content-type') || '';
  if (ct.startsWith('image')) {
    await sendImageFromUrl(conn, from, mek, response.url, caption);
  } else {
    const data = await response.json();
    const url  = data.result || data.url || data.image;
    if (!url) throw new Error('No image URL in response');
    await sendImageFromUrl(conn, from, mek, url, caption);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GPT — ChatGPT4 via davidcyriltech
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'gpt',
  alias: ['chatgpt', 'gpt4'],
  desc: 'Ask ChatGPT4 a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :gpt What is life?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://api.davidcyriltech.my.id/ai/gpt4?text=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ GPT failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BING — Bing AI (same backend as gpt in source)
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'bing',
  alias: ['bingai'],
  desc: 'Ask Bing AI a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :bing What is life?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://api.davidcyriltech.my.id/ai/gpt4?text=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ Bing AI failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUMINE — GPT4 via widipe
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'lumine',
  alias: ['lumineai'],
  desc: 'Ask Lumine AI a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :lumine What is the weather today?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://widipe.com/v3/gpt4?text=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ Lumine failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI — Google Gemini Pro
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'gemini',
  alias: ['geminiAI', 'geminipro'],
  desc: 'Ask Gemini AI a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :gemini What is the weather today?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ Gemini failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DAVINCI — OpenAI Turbo via widipe
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'davinci',
  alias: ['turbo', 'davinciAI'],
  desc: 'Ask Davinci AI a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :davinci What is the meaning of life?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://widipe.com/turbo?text=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ Davinci failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMISI — SimSimi via widipe (different endpoint from existing alexa)
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'simisi',
  alias: ['simi'],
  desc: 'Chat with SimSimi AI',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a message!*\nExample: :simisi How are you?');
  try {
    await aiTextCmd(conn, mek, from, q,
      `https://widipe.com/simi?text=${encodeURIComponent(q)}`);
  } catch (e) { reply('❌ SimSimi failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLACKBOX — BlackBox AI
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'blackbox',
  alias: ['bbox', 'blackboxai'],
  desc: 'Ask BlackBox AI a question',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a query!*\nExample: :blackbox Explain recursion');
  try {
    await conn.sendMessage(from, { text: '_Processing your request... 🤔_' }, { quoted: mek });
    await new Promise(r => setTimeout(r, 1000));
    const res  = await fetch(`https://giftedapis.us.kg/api/ai/blackbox?q=${encodeURIComponent(q)}&apikey=gifted`, { timeout: 30000 });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const text = data.result || data.message || data.response || JSON.stringify(data);
    await conn.sendMessage(from, { text: `*Response:*\n\n${text}` }, { quoted: mek });
  } catch (e) { reply('❌ BlackBox failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DALLE — AI image generation via giftedtech
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'dalle',
  alias: ['dalle2', 'dalleai'],
  desc: 'Generate an AI image using DALLE',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a prompt!*\nExample: :dalle a cat in space');
  try {
    await conn.sendMessage(from, { react: { text: '🎨', key: mek.key } });
    const res = await fetch(`https://api.giftedtech.my.id/api/ai/sd?apikey=gifted&prompt=${encodeURIComponent(q)}`, { timeout: 60000 });
    await handleImageResponse(conn, from, mek, res, '*Made by QUEEN_KYLIE-V1 👸❤️🧸*');
  } catch (e) { reply('❌ DALLE failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SD — Stable Diffusion via widipe
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'sd',
  alias: ['stablediffusion', 'stablediff'],
  desc: 'Generate an image using Stable Diffusion',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('*Provide a prompt!*\nExample: :sd a sunset over mountains');
  try {
    await conn.sendMessage(from, { react: { text: '🖼️', key: mek.key } });
    const res = await fetch(`https://widipe.com/stablediffusion?text=${encodeURIComponent(q)}`, { timeout: 60000 });
    await handleImageResponse(conn, from, mek, res, '*Made by QUEEN_KYLIE-V1 👸❤️🧸*');
  } catch (e) { reply('❌ Stable Diffusion failed: ' + e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RMBG — Remove image background
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'rmbg',
  alias: ['removebg', 'bgremove'],
  desc: 'Remove background from an image',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  // Resolve image from message or quoted
  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  let target = mek;
  if (ctx?.quotedMessage?.imageMessage) {
    target = { key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
  }
  const hasImage = target.message?.imageMessage;
  if (!hasImage) return reply('*Reply to an image!*');

  try {
    await conn.sendMessage(from, { react: { text: '✂️', key: mek.key } });
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });

    // Upload to catbox first to get a URL
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', '');
    form.append('fileToUpload', buffer, { filename: 'image.jpg' });
    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(), timeout: 60000
    });
    const imageUrl = uploadRes.data?.trim();
    if (!imageUrl?.startsWith('https')) throw new Error('Upload failed');

    // Call removebg API
    const apiUrl = `https://api.giftedtech.my.id/api/tools/removebg?apikey=gifted&url=${encodeURIComponent(imageUrl)}`;
    const res    = await fetch(apiUrl, { timeout: 60000 });
    await handleImageResponse(conn, from, mek, res, '*Background removed by QUEEN_KYLIE-V1 ✂️*');
  } catch (e) {
    console.error('rmbg error:', e);
    reply('❌ Failed to remove background: ' + e.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Vyro.ai image processing helper (remini / dehaze / recolor)
// ─────────────────────────────────────────────────────────────────────────────
async function vyroProcess(buffer, endpoint) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('model_version', '1', {
      'Content-Transfer-Encoding': 'binary',
      contentType: 'multipart/form-data; charset=utf-8',
    });
    form.append('image', Buffer.from(buffer), {
      filename: endpoint + '.jpg',
      contentType: 'image/jpeg',
    });
    form.submit({
      url:      `https://inferenceengine.vyro.ai/${endpoint}`,
      host:     'inferenceengine.vyro.ai',
      path:     '/' + endpoint,
      protocol: 'https:',
      headers: {
        'User-Agent':       'okhttp/4.9.3',
        'Connection':       'Keep-Alive',
        'Accept-Encoding':  'gzip',
      },
    }, (err, res) => {
      if (err) return reject(err);
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });
}

async function vyroCmd(conn, mek, from, reply, endpoint, label) {
  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  let target = mek;
  if (ctx?.quotedMessage?.imageMessage) {
    target = { key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
  }
  if (!target.message?.imageMessage) return reply('*Reply to an image!*');
  try {
    await conn.sendMessage(from, { react: { text: '⚙️', key: mek.key } });
    const buffer  = await downloadMediaMessage(target, 'buffer', {}, { logger: undefined, reuploadRequest: conn.updateMediaMessage });
    const result  = await vyroProcess(buffer, endpoint);
    await conn.sendMessage(from, { image: result, caption: `*${label} by QUEEN_KYLIE-V1 👸*` }, { quoted: mek });
  } catch (e) {
    console.error(`${endpoint} error:`, e);
    reply(`❌ ${label} failed: ` + e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REMINI — Enhance image quality
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'remini',
  alias: ['enhance', 'hd'],
  desc: 'Enhance image quality using AI',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await vyroCmd(conn, mek, from, reply, 'enhance', 'Image Enhanced');
});

// ─────────────────────────────────────────────────────────────────────────────
// DEHAZE — Remove haze from image
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'dehaze',
  alias: ['desmoke', 'defog'],
  desc: 'Remove haze/fog from an image',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await vyroCmd(conn, mek, from, reply, 'dehaze', 'Image Dehazed');
});

// ─────────────────────────────────────────────────────────────────────────────
// RECOLOR — Colorize/recolor an image
// ─────────────────────────────────────────────────────────────────────────────
cmd({
  pattern: 'recolor',
  alias: ['colorize', 'colorise'],
  desc: 'Recolor/colorize an image using AI',
  category: 'ai',
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  await vyroCmd(conn, mek, from, reply, 'recolor', 'Image Recolored');
});
