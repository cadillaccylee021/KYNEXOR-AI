'use strict';
const { cmd } = require('../command');
const yts     = require('yt-search');
const axios   = require('axios');
const config  = require('../config');

// ── Multi-API YouTube downloaders ─────────────────────────────────────
// Each returns a URL string or null. They are tried in order until one works.

async function getAudioUrl(videoUrl) {
  const encodedUrl = encodeURIComponent(videoUrl);

  // API 1: giftedtech ytmp3
  try {
    const r = await axios.get(
      `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodedUrl}&quality=128kbps`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 2: giftedtech savetubemp3
  try {
    const r = await axios.get(
      `https://api.giftedtech.co.ke/api/download/savetubemp3?apikey=gifted&url=${encodedUrl}`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 3: giftedtechnexus
  try {
    const r = await axios.get(
      `https://api.giftedtechnexus.co.ke/api/download/ytmp3?apikey=gifteddevskk&url=${encodedUrl}`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 4: cobalt (open source, no key)
  try {
    const r = await axios.post(
      'https://cobalt-api.kwiatekkamilek.pl/',
      { url: videoUrl, isAudioOnly: true, aFormat: 'mp3' },
      { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    if (r.data?.url) return r.data.url;
  } catch {}

  return null;
}

async function getVideoUrl(videoUrl) {
  const encodedUrl = encodeURIComponent(videoUrl);

  // API 1: giftedtech savetubemp4
  try {
    const r = await axios.get(
      `https://api.giftedtech.co.ke/api/download/savetubemp4?apikey=gifted&url=${encodedUrl}`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 2: giftedtech ytmp4
  try {
    const r = await axios.get(
      `https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${encodedUrl}&quality=720p`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 3: giftedtechnexus
  try {
    const r = await axios.get(
      `https://api.giftedtechnexus.co.ke/api/download/ytmp4?apikey=gifteddevskk&url=${encodedUrl}`,
      { timeout: 20000 }
    );
    if (r.data?.success && r.data?.result?.download_url) return r.data.result.download_url;
  } catch {}

  // API 4: cobalt (open source, no key)
  try {
    const r = await axios.post(
      'https://cobalt-api.kwiatekkamilek.pl/',
      { url: videoUrl, vQuality: '720' },
      { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    if (r.data?.url) return r.data.url;
  } catch {}

  // API 5: y2mate-style API (no key)
  try {
    const r = await axios.get(
      `https://api.vevioz.com/@api/button/mp4/720/${encodedUrl}`,
      { timeout: 20000 }
    );
    const url = r.data?.url || r.data?.dlink || r.data?.link;
    if (url) return url;
  } catch {}

  return null;
}

// ── Command ───────────────────────────────────────────────────────────
cmd({
  pattern:  'video',
  alias:    ['video2', 'play2', 'yt'],
  desc:     'Download YouTube audio or video — reply with 1 or 2',
  category: 'download',
  filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('❌ Please provide a search query or YouTube URL!');

    // Search YouTube
    const search = await yts(q);
    const video  = search.videos[0];
    if (!video) return reply('❌ No results found!');

    const videoUrl = video.url;
    const infoText =
      `*🎵 YT DOWNLOADER 🎵*\n\n` +
      `*📝 Title:* ${video.title}\n` +
      `*⏳ Duration:* ${video.timestamp}\n` +
      `*👁️ Views:* ${Number(video.views || 0).toLocaleString()}\n\n` +
      `*Reply with a number:*\n` +
      `1️⃣ *Audio (MP3)*\n` +
      `2️⃣ *Video (MP4)*\n\n` +
      `_I am waiting for your reply..._`;

    // Send the menu card
    const sentMsg = await conn.sendMessage(from, {
      image:   { url: video.thumbnail },
      caption: infoText
    }, { quoted: mek });

    const messageId = sentMsg.key.id;

    // ── Listener ──────────────────────────────────────────────────────
    const handler = async (update) => {
      const msg = update.messages[0];
      if (!msg?.message) return;
      if (msg.key.remoteJid !== from) return;

      // Skip the menu card we just sent (by its known ID)
      // ⚠️ DO NOT check msg.key.fromMe — owner-as-bot sends fromMe=true for their own replies
      if (msg.key.id === messageId) return;

      // Extract text from any message type
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      // Must be a reply to our menu card
      const ctx =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo        ||
        msg.message?.videoMessage?.contextInfo        ||
        null;

      if (!ctx || ctx.stanzaId !== messageId) return;
      if (text !== '1' && text !== '2') return;

      // Kill listener — one response per menu
      conn.ev.off('messages.upsert', handler);
      clearTimeout(killTimer);

      if (text === '1') {
        await conn.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        await conn.sendMessage(from, { text: '🎧 Fetching audio...' }, { quoted: msg });

        const audioUrl = await getAudioUrl(videoUrl);

        if (audioUrl) {
          await conn.sendMessage(from, {
            audio:    { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt:      false
          }, { quoted: msg });
          await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } else {
          await conn.sendMessage(from, { react: { text: '❌', key: msg.key } });
          reply('❌ All audio APIs failed. Try again later.');
        }

      } else if (text === '2') {
        await conn.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        await conn.sendMessage(from, { text: '🎬 Fetching video...' }, { quoted: msg });

        const videoDownloadUrl = await getVideoUrl(videoUrl);

        if (videoDownloadUrl) {
          await conn.sendMessage(from, {
            video:    { url: videoDownloadUrl },
            mimetype: 'video/mp4',
            caption:  `🎵 *${video.title}*\n_${config.BOT_NAME || 'QUEEN KYLIE V1'}_`
          }, { quoted: msg });
          await conn.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } else {
          await conn.sendMessage(from, { react: { text: '❌', key: msg.key } });
          reply('❌ All video APIs failed. Try again or use a shorter video.');
        }
      }
    };

    conn.ev.on('messages.upsert', handler);

    // Auto-kill after 5 minutes
    const killTimer = setTimeout(() => {
      conn.ev.off('messages.upsert', handler);
    }, 300000);

  } catch (error) {
    console.error('[video]', error);
    reply('❌ An error occurred. Try again.');
  }
});
