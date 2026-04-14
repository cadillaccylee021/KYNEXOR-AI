'use strict';
const { cmd }   = require('../command');
const axios     = require('axios');
const config    = require('../config');

const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'];

function fmtNum(n) {
  if (!n) return '?';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function getField(obj, ...keys) {
  for (const k of keys) {
    const val = k.split('.').reduce((o, p) => o?.[p], obj);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return null;
}

async function downloadByUrl(videoUrl) {
  const res = await axios.get(
    `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`,
    { timeout: 30000 }
  );
  const d = res.data?.data;
  if (!d?.play) throw new Error('Could not get download link');
  return d;
}

cmd({
  pattern:  'ttsearch',
  alias:    ['tts', 'tiktoksearch', 'searchtt'],
  desc:     'Search TikTok — sends thumbnail previews, just reply to any one to download',
  category: 'downloader',
  react:    '🔍',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply(
    `🎵 *TikTok Search*\n\n` +
    `*Usage:* ttsearch <keyword>\n` +
    `*Example:* ttsearch afrobeats 2025\n\n` +
    `_Bot will send previews — just reply to any one to download it._`
  );

  await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

  let items = [];

  try {
    const res = await axios.get(
      `https://meta.davidxtech.de/api/tiktokv2/search?q=${encodeURIComponent(q)}`,
      { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const raw  = res.data;
    const list =
      raw?.data?.videos || raw?.data?.items || raw?.results ||
      raw?.items || (Array.isArray(raw?.data) ? raw.data : null) ||
      (Array.isArray(raw) ? raw : null);

    if (Array.isArray(list) && list.length) {
      items = list.slice(0, 5).map(v => ({
        title:    getField(v, 'desc', 'title', 'video_description', 'caption') || 'No title',
        author:   getField(v, 'author.unique_id', 'author.nickname', 'username', 'author_name') || 'unknown',
        likes:    getField(v, 'digg_count', 'statistics.diggCount', 'like_count'),
        plays:    getField(v, 'play_count', 'statistics.playCount', 'view_count'),
        duration: getField(v, 'duration'),
        cover:    getField(v, 'cover', 'origin_cover', 'thumbnail', 'cover_image_url', 'video.cover'),
        url:      getField(v, 'share_url', 'url', 'video_url',
                    v.id || v.aweme_id
                      ? `https://www.tiktok.com/@${getField(v, 'author.unique_id', 'username') || 'user'}/video/${v.id || v.aweme_id}`
                      : null),
      })).filter(v => v.url);
    }
  } catch (e) {
    console.error('[ttsearch] davidxtech error:', e.message);
  }

  if (!items.length) {
    try {
      const res = await axios.get(
        `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=5&cursor=0`,
        { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const list = res.data?.data?.videos || res.data?.data || [];
      if (Array.isArray(list) && list.length) {
        items = list.slice(0, 5).map(v => ({
          title:    v.title || v.desc || 'No title',
          author:   v.author?.unique_id || v.author?.nickname || 'unknown',
          likes:    v.digg_count,
          plays:    v.play_count,
          duration: v.duration,
          cover:    v.cover || v.origin_cover,
          url:      `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id || v.id}`,
        }));
      }
    } catch (e2) {
      console.error('[ttsearch] tikwm fallback error:', e2.message);
    }
  }

  if (!items.length) {
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    return reply(`❌ No results found for *"${q}"*.\nTry a different keyword.`);
  }

  // ── Send preview cards ────────────────────────────────────────────
  const sentIds = new Map(); // messageId → item index

  await conn.sendMessage(from, {
    text: `🔍 *TikTok: "${q}"* — ${items.length} results\n_↩️ Reply to any preview below to download it_`
  }, { quoted: mek });

  for (let i = 0; i < items.length; i++) {
    const v   = items[i];
    const dur = v.duration
      ? `⏱ ${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}`
      : '';

    const caption =
      `${EMOJIS[i]} *${v.title.length > 80 ? v.title.substring(0, 77) + '...' : v.title}*\n\n` +
      `👤 @${v.author}\n` +
      [dur, v.likes ? `❤️ ${fmtNum(v.likes)}` : '', v.plays ? `▶️ ${fmtNum(v.plays)}` : '']
        .filter(Boolean).join('  ') +
      `\n\n_↩️ Reply to download this video_`;

    try {
      const sent = v.cover
        ? await conn.sendMessage(from, { image: { url: v.cover }, caption }, { quoted: mek })
        : await conn.sendMessage(from, { text: caption }, { quoted: mek });
      if (sent?.key?.id) sentIds.set(sent.key.id, i);
    } catch (e) {
      console.error(`[ttsearch] send preview ${i + 1} error:`, e.message);
    }
  }

  await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  // ── Listener ──────────────────────────────────────────────────────
  const handler = async ({ messages }) => {
    const msg = messages[0];

    // Must have a message and be in the same chat
    if (!msg?.message) return;
    if (msg.key.remoteJid !== from) return;

    // Skip the bot's own outgoing messages by their known IDs
    // ⚠️ DO NOT check msg.key.fromMe here — when the owner IS the bot number,
    // their reply arrives with fromMe=true and would get incorrectly skipped
    if (sentIds.has(msg.key.id)) return;

    // Must be a reply (contextInfo.stanzaId) pointing to one of our cards
    // Check all possible message types that can carry a reply
    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo        ||
      msg.message?.videoMessage?.contextInfo        ||
      msg.message?.audioMessage?.contextInfo        ||
      msg.message?.stickerMessage?.contextInfo      ||
      null;

    const stanzaId = ctx?.stanzaId;
    if (!stanzaId || !sentIds.has(stanzaId)) return;

    // Matched — stop listening and download
    conn.ev.off('messages.upsert', handler);
    clearTimeout(killTimer);

    const video = items[sentIds.get(stanzaId)];

    await conn.sendMessage(from, {
      text: `⏳ Downloading *${video.title.substring(0, 50)}...*`
    }, { quoted: msg });

    try {
      const d = await downloadByUrl(video.url);

      const caption =
        `🎵 *${video.title.substring(0, 80)}${video.title.length > 80 ? '...' : ''}*\n\n` +
        `👤 @${video.author}\n` +
        (d.duration ? `⏱ ${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, '0')}\n` : '') +
        (d.digg_count ? `❤️ ${fmtNum(d.digg_count)}\n` : '') +
        `\n_${config.BOT_NAME || 'QUEEN KYLIE V1'}_`;

      await conn.sendMessage(from, {
        video:    { url: d.play },
        mimetype: 'video/mp4',
        caption
      }, { quoted: msg });

    } catch (e) {
      console.error('[ttsearch] download error:', e.message);
      await conn.sendMessage(from, {
        text: `❌ Download failed: ${e.message}\nSearch again with *ttsearch*.`
      }, { quoted: msg });
    }
  };

  conn.ev.on('messages.upsert', handler);

  const killTimer = setTimeout(() => {
    conn.ev.off('messages.upsert', handler);
  }, 5 * 60 * 1000);
});
