'use strict';
const { cmd } = require('../command');
const axios = require('axios');
const fs   = require('fs');
const path = require('path');
const config = require('../config');

// ════════════════════════════════════════════════════════════════════
// SETUP & CONSTANTS
// ════════════════════════════════════════════════════════════════════

// Ensure temp dir exists
const tmpDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const BOT = () => config.BOT_NAME || 'QUEEN KYLIE V1';

const FB_PATTERNS = [
  /https?:\/\/(?:www\.|m\.)?facebook\.com\//,
  /https?:\/\/(?:www\.|m\.)?fb\.com\//,
  /https?:\/\/fb\.watch\//,
  /https?:\/\/(?:www\.)?facebook\.com\/watch/,
  /https?:\/\/(?:www\.)?facebook\.com\/.*\/videos\//,
  /https?:\/\/(?:www\.)?facebook\.com\/reel\//,
  /https?:\/\/(?:www\.)?facebook\.com\/share\//,
];

const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'];

// ════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════

// Unified davidxtech response extractor
function extractLinks(data) {
  const links = [];
  const root  = data?.data || data?.result || data;

  // { hd, sd }
  if (root?.hd) links.push({ quality: 'HD', url: root.hd });
  if (root?.sd) links.push({ quality: 'SD', url: root.sd });

  // { url }
  if (!links.length && root?.url) links.push({ quality: 'SD', url: root.url });

  // { links/videos/medias/result: [...] }
  const arr = root?.links || root?.videos || root?.medias || root?.media || root?.items || root?.result || data?.result;
  if (Array.isArray(arr)) {
    for (const item of arr) {
      const url = item?.url || item?.download || item?.src || item?.link;
      if (!url) continue;
      const q = String(item?.quality || item?.type || item?.resolution || 'SD').toUpperCase();
      links.push({ quality: q.includes('HD') || q.includes('720') || q.includes('1080') ? 'HD' : 'SD', url });
    }
  }

  // { thumb, video } shape (some Pinterest)
  if (!links.length && root?.video) links.push({ quality: 'SD', url: root.video });

  return links;
}

async function sendVideo(conn, from, mek, videoUrl, caption) {
  try {
    await conn.sendMessage(from, { video: { url: videoUrl }, mimetype: 'video/mp4', caption }, { quoted: mek });
  } catch {
    const buf = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 90000,
      maxContentLength: 150 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => Buffer.from(r.data));
    await conn.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption }, { quoted: mek });
  }
}

async function sendImage(conn, from, mek, imageUrl, caption) {
  try {
    await conn.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: mek });
  } catch {
    const buf = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => Buffer.from(r.data));
    await conn.sendMessage(from, { image: buf, caption }, { quoted: mek });
  }
}

function isValidFbUrl(url) {
  return FB_PATTERNS.some(p => p.test(url));
}

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

// ════════════════════════════════════════════════════════════════════
// COMMANDS
// ════════════════════════════════════════════════════════════════════

// ── 0. TIKTOK DOWNLOADER ────────────────────────────────────────────
cmd({
  pattern: 'tt',
  alias: ['tiktokdl'],
  react: '🎥',
  desc: 'Download a TikTok video (no watermark)',
  category: 'downloader',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(`*Provide a TikTok link!*\nExample: ${config.PREFIX || '/'}tt https://vm.tiktok.com/...`);

    await conn.sendMessage(from, { text: '⏳ *Downloading TikTok video...*' }, { quoted: mek });

    const apiUrl = `https://api.giftedtechnexus.co.ke/api/download/tiktok?url=${encodeURIComponent(q)}&apikey=gifteddevskk`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data.success || !data.url) {
      return reply('*Could not fetch the video. Make sure the link is valid and public.*');
    }

    const tempPath = path.join(tmpDir, `tt_${Date.now()}.mp4`);

    const videoRes = await axios({ url: data.url, method: 'GET', responseType: 'stream', timeout: 60000 });
    const writer   = fs.createWriteStream(tempPath);
    videoRes.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await conn.sendMessage(from, {
      video:    fs.readFileSync(tempPath),
      caption:  '✅ *TikTok video downloaded!*',
      fileName: `tiktok_${Date.now()}.mp4`,
      mimetype: 'video/mp4'
    }, { quoted: mek });

    try { fs.unlinkSync(tempPath); } catch {}
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});

// ── 1. INSTAGRAM DOWNLOADER ─────────────────────────────────────────
cmd({
  pattern:  'igdl',
  alias:    ['ig', 'instadl', 'insta2'],
  desc:     'Download Instagram Reels, Posts, and Stories',
  category: 'downloader',
  react:    '📸',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `📸 *Instagram Downloader*\n\n` +
      `*Usage:* igdl <url>\n\n` +
      `*Supports:*\n• Reels\n• Photo & video posts\n• Stories`
    );

    const url = args.join(' ').trim();
    if (!url.includes('instagram.com') && !url.includes('instagr.am'))
      return reply('❌ Please provide a valid Instagram link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    const res = await axios.get(
      `https://meta.davidxtech.de/api/instagram/download?url=${encodeURIComponent(url)}`,
      { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
    );

    const data  = res.data;
    const links = extractLinks(data);

    // Also check for images (photo posts)
    const root  = data?.data || data?.result || data;
    const thumb = root?.thumbnail || root?.thumb || root?.cover || root?.image;

    if (!links.length && !thumb) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply('❌ Could not download. Post may be private or login-required.');
    }

    const caption = `📸 *Instagram*\n_${BOT()}_`;

    if (links.length) {
      await sendVideo(conn, from, mek, links[0].url, caption);
    } else if (thumb) {
      await sendImage(conn, from, mek, thumb, caption);
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[igdl]', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download. Make sure the post is public.');
  }
});

// ── 2. TWITTER / X DOWNLOADER ───────────────────────────────────────
cmd({
  pattern:  'xdl',
  alias:    ['twdl', 'twitterdl', 'x2'],
  desc:     'Download Twitter / X videos and GIFs',
  category: 'downloader',
  react:    '🐦',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `🐦 *Twitter / X Downloader*\n\n` +
      `*Usage:* xdl <url>\n\n` +
      `*Example:*\n` +
      `xdl https://x.com/user/status/123456789`
    );

    const url = args.join(' ').trim();
    if (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('t.co'))
      return reply('❌ Please provide a valid Twitter / X link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    const res = await axios.get(
      `https://meta.davidxtech.de/api/twitter/download?url=${encodeURIComponent(url)}`,
      { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
    );

    const links = extractLinks(res.data);
    if (!links.length) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply('❌ No downloadable video found in that tweet.\n_Only tweets with videos or GIFs can be downloaded._');
    }

    // Pick highest quality
    const best  = links.find(l => l.quality === 'HD') || links[0];
    const caption = `🐦 *Twitter / X Video*\n📹 Quality: ${best.quality}\n_${BOT()}_`;

    await sendVideo(conn, from, mek, best.url, caption);
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[xdl]', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download. The tweet may be from a private account.');
  }
});

// ── 3. PINTEREST DOWNLOADER ─────────────────────────────────────────
cmd({
  pattern:  'pindl',
  alias:    ['pin', 'pintdl', 'pinterestdl'],
  desc:     'Download Pinterest videos and images',
  category: 'downloader',
  react:    '📌',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `📌 *Pinterest Downloader*\n\n` +
      `*Usage:* pindl <url>\n\n` +
      `*Supports:* video pins, image pins`
    );

    const url = args.join(' ').trim();
    if (!url.includes('pinterest.com') && !url.includes('pin.it'))
      return reply('❌ Please provide a valid Pinterest link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    const res = await axios.get(
      `https://meta.davidxtech.de/api/pinterest/download?url=${encodeURIComponent(url)}`,
      { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
    );

    const data   = res.data;
    const links  = extractLinks(data);
    const root   = data?.data || data?.result || data;
    const imgUrl = root?.image || root?.thumbnail || root?.thumb || root?.cover;

    if (!links.length && !imgUrl) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply('❌ Could not download that pin.\n_Try with the direct pin link._');
    }

    const caption = `📌 *Pinterest*\n_${BOT()}_`;

    if (links.length) {
      await sendVideo(conn, from, mek, links[0].url, caption);
    } else {
      await sendImage(conn, from, mek, imgUrl, caption);
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[pindl]', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download that pin.');
  }
});

// ── 4. SPOTIFY DOWNLOADER ───────────────────────────────────────────
cmd({
  pattern:  'spdl',
  alias:    ['spotify', 'spotdl', 'sp2'],
  desc:     'Download Spotify tracks as MP3',
  category: 'downloader',
  react:    '🎧',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `🎧 *Spotify Downloader*\n\n` +
      `*Usage:* spdl <spotify url>\n\n` +
      `*Example:*\n` +
      `spdl https://open.spotify.com/track/xxxxxx`
    );

    const url = args.join(' ').trim();
    if (!url.includes('spotify.com'))
      return reply('❌ Please provide a valid Spotify track link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    const res = await axios.get(
      `https://api.giftedtech.co.ke/api/download/spotify?apikey=gifted&url=${encodeURIComponent(url)}`,
      { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    const d = res.data?.result || res.data?.data || res.data;
    const audioUrl = d?.download_url || d?.audio || d?.url || d?.mp3;
    const title    = d?.title || d?.name || 'Spotify Track';
    const artist   = d?.artist || d?.artists || '';
    const cover    = d?.thumbnail || d?.image || d?.cover;

    if (!audioUrl) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply('❌ Could not download this track.\n_Only individual tracks are supported (not playlists or albums)._');
    }

    const caption =
      `🎧 *${title}*\n` +
      (artist ? `👤 ${artist}\n` : '') +
      `_${BOT()}_`;

    // Send cover image first if available
    if (cover) {
      await conn.sendMessage(from, { image: { url: cover }, caption }).catch(() => {});
    }

    // Send audio
    try {
      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: mek });
    } catch {
      const buf = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: 50 * 1024 * 1024
      }).then(r => Buffer.from(r.data));
      await conn.sendMessage(from, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[spdl]', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download. Only public Spotify tracks are supported.');
  }
});

// ── 5. FACEBOOK DOWNLOADER ──────────────────────────────────────────
cmd({
  pattern:  'facebook',
  alias:    ['fb', 'fbdl', 'facebookdl'],
  desc:     'Download Facebook videos and reels',
  category: 'downloader',
  react:    '🔄',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `📘 *Facebook Downloader*\n\n` +
      `*Usage:* .facebook <url>\n\n` +
      `*Supports:* videos, reels, fb.watch links`
    );

    const url = args.join(' ').trim();
    if (!isValidFbUrl(url)) return reply('❌ Not a valid Facebook link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    let links = [];

    // ── Method 1: davidxtech ──────────────────────────────────────
    try {
      const res = await axios.get(
        `https://meta.davidxtech.de/api/facebook/download?url=${encodeURIComponent(url)}`,
        { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
      );
      links = extractLinks(res.data);
      console.log('[FB] davidxtech links:', links.length);
    } catch (e) {
      console.error('[FB] davidxtech error:', e.message);
    }

    // ── Method 2: snapsave fallback ───────────────────────────────
    if (!links.length) {
      try {
        const home = await axios.get('https://snapsave.app/', {
          headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000
        });
        const tokenMatch = home.data.match(/name="token"\s+value="([^"]+)"/);
        if (tokenMatch) {
          const form = new URLSearchParams();
          form.append('url', url);
          form.append('token', tokenMatch[1]);
          const res = await axios.post('https://snapsave.app/action.php', form.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': 'https://snapsave.app/', 'Origin': 'https://snapsave.app',
              'User-Agent': 'Mozilla/5.0'
            }, timeout: 20000
          });
          const html = res.data;
          const hdM = html.match(/href="(https:\/\/[^"]+)"[^>]*>\s*(?:HD|High)/i);
          const sdM = html.match(/href="(https:\/\/[^"]+)"[^>]*>\s*(?:SD|Normal|Low)/i);
          const anyM = [...html.matchAll(/href="(https:\/\/[^"]+\.mp4[^"]*)"/gi)];
          if (hdM) links.push({ quality: 'HD', url: hdM[1] });
          if (sdM) links.push({ quality: 'SD', url: sdM[1] });
          if (!links.length && anyM.length) links.push({ quality: 'SD', url: anyM[0][1] });
          console.log('[FB] snapsave links:', links.length);
        }
      } catch (e2) {
        console.error('[FB] snapsave error:', e2.message);
      }
    }

    if (!links.length) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply(
        '❌ Could not download this video.\n\n' +
        '_Possible reasons:_\n• Video is private or friends-only\n• Live stream not yet ended\n\n' +
        '_Only public videos can be downloaded._'
      );
    }

    const best = links.find(l => l.quality === 'HD') || links[0];
    const caption =
      `📘 *Facebook Video*\n📹 Quality: ${best.quality}\n_${BOT()}_`;

    try {
      await conn.sendMessage(from, {
        video: { url: best.url }, mimetype: 'video/mp4', caption
      }, { quoted: mek });
    } catch {
      const buf = await axios.get(best.url, {
        responseType: 'arraybuffer', timeout: 90000,
        maxContentLength: 150 * 1024 * 1024,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.facebook.com/' }
      }).then(r => Buffer.from(r.data));
      await conn.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[FB] Fatal:', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download. Make sure the video is public and try again.');
  }
});

// ── 6. SOUNDCLOUD DOWNLOADER ────────────────────────────────────────
cmd({
  pattern:  'scdl',
  alias:    ['soundcloud', 'sc2'],
  desc:     'Download SoundCloud tracks as MP3',
  category: 'downloader',
  react:    '🔊',
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args[0]) return reply(
      `🔊 *SoundCloud Downloader*\n\n` +
      `*Usage:* scdl <soundcloud url>`
    );

    const url = args.join(' ').trim();
    if (!url.includes('soundcloud.com'))
      return reply('❌ Please provide a valid SoundCloud link.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    const res = await axios.get(
      `https://api.giftedtech.co.ke/api/download/soundcloud?apikey=gifted&url=${encodeURIComponent(url)}`,
      { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    const d        = res.data?.result || res.data?.data || res.data;
    const audioUrl = d?.download_url || d?.audio || d?.url || d?.mp3;
    const title    = d?.title || d?.name || 'SoundCloud Track';
    const artist   = d?.artist || d?.username || d?.uploader || '';
    const cover    = d?.thumbnail || d?.image || d?.cover;

    if (!audioUrl) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply('❌ Could not download this track.');
    }

    if (cover) {
      await conn.sendMessage(from, {
        image: { url: cover },
        caption: `🔊 *${title}*${artist ? `\n👤 ${artist}` : ''}\n_${BOT()}_`
      }).catch(() => {});
    }

    try {
      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: mek });
    } catch {
      const buf = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: 50 * 1024 * 1024
      }).then(r => Buffer.from(r.data));
      await conn.sendMessage(from, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[scdl]', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Failed to download that track.');
  }
});

// ── 7. TIKTOK SEARCH & DOWNLOADER ───────────────────────────────────
/*cmd({
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

  // ── Fetch results ─────────────────────────────────────────────────
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

  // Fallback: tikwm search
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

  // ── Send one thumbnail preview card per result ────────────────────
  // sentIds maps  messageId → item index
  const sentIds = new Map();

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
      let sent;
      if (v.cover) {
        sent = await conn.sendMessage(from, {
          image:   { url: v.cover },
          caption: caption
        }, { quoted: mek });
      } else {
        sent = await conn.sendMessage(from, { text: caption }, { quoted: mek });
      }
      if (sent?.key?.id) sentIds.set(sent.key.id, i);
    } catch (e) {
      console.error(`[ttsearch] send preview ${i + 1} error:`, e.message);
    }
  }

  await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  // ── Listener: reply to any preview card triggers download ─────────
  let killTimer; // Declared here to fix the scope issue
  
  const handler = async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe || msg.key.remoteJid !== from) return;

    const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!stanzaId || !sentIds.has(stanzaId)) return;

    // Kill listener immediately — one download per search
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
        `\n_${BOT()}_`;

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

  // Auto-kill after 5 minutes
  killTimer = setTimeout(() => {
    conn.ev.off('messages.upsert', handler);
  }, 5 * 60 * 1000);
});*/ 

