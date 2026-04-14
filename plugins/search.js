'use strict';
const { cmd } = require('../command');
const axios = require('axios');
const fetch = require('node-fetch');
const config = require('../config');

const bot = config.BOT_NAME || 'Queen-Kylie-v1';

// ── lyrics ────────────────────────────────────────────────────────────
// plugins/lyrics.js
// Free lyrics using lrclib.net (3M+ songs, no key, no rate limit)
// Fallback: api.lyrics.ovh (no key)
// Pattern: lyrics2 — avoids conflict with any existing lyrics c

// ── Strip LRC timestamps from synced lyrics ───────────────────────────
// Converts "[00:27.93] Listen to the wind blow" → "Listen to the wind blow"
function stripTimestamps(lrc) {
  return lrc
    .split('\n')
    .map(l => l.replace(/^\[\d{2}:\d{2}\.\d{2,3}\]\s?/, '').trim())
    .filter(Boolean)
    .join('\n');
}

// ── Split long lyrics into WhatsApp-safe chunks (max 4000 chars) ──────
function chunkLyrics(text, size = 3800) {
  const lines  = text.split('\n');
  const chunks = [];
  let   cur    = '';
  for (const line of lines) {
    if ((cur + '\n' + line).length > size) {
      if (cur) chunks.push(cur.trim());
      cur = line;
    } else {
      cur += (cur ? '\n' : '') + line;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

cmd({
  pattern:  'lyrics2',
  alias:    ['lyric', 'lyr', 'getlyrics', 'songlyrics'],
  desc:     'Get song lyrics. Usage: lyrics2 <song name> or lyrics2 <artist> - <song>',
  category: 'search',
  react:    '🎵',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply(
      `🎵 *Lyrics Finder*\n\n` +
      `*Usage:*\n` +
      `• lyrics2 <song name>\n` +
      `• lyrics2 <artist> - <song>\n\n` +
      `*Examples:*\n` +
      `lyrics2 Blinding Lights\n` +
      `lyrics2 The Weeknd - Blinding Lights`
    );

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    // Parse "artist - song" format if given
    let artistQuery = '';
    let trackQuery  = q;
    if (q.includes(' - ')) {
      const parts = q.split(' - ');
      artistQuery  = parts[0].trim();
      trackQuery   = parts.slice(1).join(' - ').trim();
    }

    let result = null;
    let source = '';

    // ── Method 1: lrclib.net search ─────────────────────────────────
    // No key, no rate limit, 3M+ songs
    try {
      const params = new URLSearchParams({ q });
      if (artistQuery) params.set('artist_name', artistQuery);
      if (trackQuery !== q) params.set('track_name', trackQuery);

      const res  = await axios.get(`https://lrclib.net/api/search?${params.toString()}`, {
        timeout: 15000,
        headers: { 'User-Agent': 'Queen KylieV2-Bot/1.0 (WhatsApp Bot)' }
      });

      const hits = res.data;
      if (Array.isArray(hits) && hits.length) {
        // Prefer results that have actual lyrics
        const withLyrics = hits.find(h => h.plainLyrics && !h.instrumental);
        const best       = withLyrics || hits[0];

        if (best && (best.plainLyrics || best.syncedLyrics)) {
          result = {
            title:  best.trackName  || trackQuery,
            artist: best.artistName || artistQuery || 'Unknown',
            album:  best.albumName  || '',
            lyrics: best.plainLyrics || stripTimestamps(best.syncedLyrics || ''),
            instrumental: best.instrumental
          };
          source = 'lrclib';
        }
      }
    } catch (e) {
      console.error('[lyrics] lrclib error:', e.message);
    }

    // ── Method 2: lyrics.ovh fallback ───────────────────────────────
    if (!result && artistQuery && trackQuery) {
      try {
        const res = await axios.get(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artistQuery)}/${encodeURIComponent(trackQuery)}`,
          { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (res.data?.lyrics) {
          result = {
            title:  trackQuery,
            artist: artistQuery,
            album:  '',
            lyrics: res.data.lyrics.trim(),
            instrumental: false
          };
          source = 'lyrics.ovh';
        }
      } catch (e) {
        console.error('[lyrics] lyrics.ovh error:', e.message);
      }
    }

    // ── Method 3: giftedtech lyrics fallback ────────────────────────
    if (!result) {
      try {
        const res = await axios.get(
          `https://api-gifted-tech.onrender.com/api/search/lyrics?query=${encodeURIComponent(q)}&apikey=gifteddevskk`,
          { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const d = res.data;
        if (d?.result?.lyrics || d?.lyrics) {
          result = {
            title:  d?.result?.title || d?.title || trackQuery,
            artist: d?.result?.artist || d?.artist || '',
            album:  '',
            lyrics: (d?.result?.lyrics || d?.lyrics || '').trim(),
            instrumental: false
          };
          source = 'gifted';
        }
      } catch (e) {
        console.error('[lyrics] giftedtech error:', e.message);
      }
    }

    // ── Not found ────────────────────────────────────────────────────
    if (!result) {
      await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
      return reply(
        `❌ Lyrics not found for *"${q}"*.\n\n` +
        `_Tips:_\n` +
        `• Try: lyrics2 <artist> - <song>\n` +
        `• Check your spelling\n` +
        `• Use the English song title`
      );
    }

    // ── Instrumental track ───────────────────────────────────────────
    if (result.instrumental) {
      await conn.sendMessage(from, { react: { text: '🎼', key: mek.key } });
      return reply(`🎼 *${result.title}* by *${result.artist}* is an instrumental track — no lyrics available.`);
    }

    // ── Send lyrics ──────────────────────────────────────────────────
    const header =
      `🎵 *${result.title}*\n` +
      `👤 ${result.artist}\n` +
      (result.album ? `💿 ${result.album}\n` : '') +
      `${'─'.repeat(28)}`;

    const fullLyrics = `${header}\n\n${result.lyrics}`;
    const chunks     = chunkLyrics(fullLyrics);

    // Send first chunk as reply to the command
    await conn.sendMessage(from, { text: chunks[0] }, { quoted: mek });

    // Send remaining chunks sequentially (no quoted needed)
    for (let i = 1; i < chunks.length; i++) {
      await new Promise(r => setTimeout(r, 600)); // slight delay between messages
      await conn.sendMessage(from, { text: chunks[i] });
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (err) {
    console.error('[lyrics] Fatal:', err.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    reply('❌ Something went wrong. Try again.');
  }
});

// ── github ────────────────────────────────────────────────────────────
cmd({ pattern: 'github', alias: ['gsearch'], desc: 'GitHub user info', category: 'search', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide a GitHub username!*\nExample: /github torvalds');
    const { data } = await axios.get(`https://api.github.com/users/${q}`);
    const msg = `👤 *GitHub User Info*\n\n🆔 *ID:* ${data.id}\n📛 *Name:* ${data.name || 'N/A'}\n🔗 *Login:* ${data.login}\n📝 *Bio:* ${data.bio || 'N/A'}\n🏢 *Company:* ${data.company || 'N/A'}\n📍 *Location:* ${data.location || 'N/A'}\n📧 *Email:* ${data.email || 'N/A'}\n📁 *Repos:* ${data.public_repos}\n❤️ *Followers:* ${data.followers}\n👉 *Following:* ${data.following}\n📅 *Joined:* ${data.created_at?.split('T')[0]}`;
    if (data.avatar_url) {
      await conn.sendMessage(from, { image: { url: data.avatar_url }, caption: msg }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── coffe ─────────────────────────────────────────────────────────────
cmd({ pattern: 'coffe', alias: ['coffee'], react: '☕', desc: 'Random coffee image', category: 'search', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    await conn.sendMessage(from, { image: { url: 'https://coffee.alexflipnote.dev/random' }, caption: '☕ *Here is your coffee!*' }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── imdb ──────────────────────────────────────────────────────────────
cmd({ pattern: 'imdb', desc: 'Movie/series info from IMDB', category: 'search', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide a movie/series title!*\nExample: /imdb Avengers');
    const { data } = await axios.get(`http://www.omdbapi.com/?apikey=742b2d09&t=${encodeURIComponent(q)}&plot=full`);
    if (!data || data.Response === 'False') return reply('*Movie/series not found!*');
    const msg = `🎬 *${data.Title}* (${data.Year})\n\n⭐ *Rated:* ${data.Rated}\n📅 *Released:* ${data.Released}\n⏳ *Runtime:* ${data.Runtime}\n🎭 *Genre:* ${data.Genre}\n🎬 *Director:* ${data.Director}\n👨 *Actors:* ${data.Actors}\n📝 *Plot:* ${data.Plot}\n🌐 *Language:* ${data.Language}\n🌍 *Country:* ${data.Country}\n🏆 *Awards:* ${data.Awards}\n📦 *Box Office:* ${data.BoxOffice}\n🌟 *IMDB Rating:* ${data.imdbRating}/10`;
    if (data.Poster && data.Poster !== 'N/A') {
      await conn.sendMessage(from, { image: { url: data.Poster }, caption: msg }, { quoted: mek });
    } else {
      await conn.sendMessage(from, { text: msg }, { quoted: mek });
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── weather ───────────────────────────────────────────────────────────
cmd({ pattern: 'weather', desc: 'Weather info for a city', category: 'search', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide a city name!*\nExample: /weather Johannesburg');
    const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`);
    if (!data || data.cod === '404') return reply('*City not found!*');
    const msg = `🌍 *Weather in ${q}*\n\n☁️ *Condition:* ${data.weather[0].main} — ${data.weather[0].description}\n🌡️ *Temperature:* ${data.main.temp}°C (Feels like ${data.main.feels_like}°C)\n💧 *Humidity:* ${data.main.humidity}%\n💨 *Wind:* ${data.wind.speed} m/s\n📍 *Lat/Lon:* ${data.coord.lat}, ${data.coord.lon}\n🌐 *Country:* ${data.sys.country}`;
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── npm ────────────────────────────────────────────────────────────────
cmd({ pattern: 'npm', desc: 'Search npm packages', category: 'search', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide a package name!*\nExample: /npm axios');
    const { data } = await axios.get(`https://api.npms.io/v2/search?q=${encodeURIComponent(q)}`);
    if (!data?.results?.length) return reply('*No packages found.*');
    const txt = data.results.slice(0, 5).map(({ package: pkg }) =>
      `📦 *${pkg.name}* (v${pkg.version})\n📝 ${pkg.description || 'No description'}\n🔗 ${pkg.links?.npm}`
    ).join('\n\n');
    await conn.sendMessage(from, { text: txt }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── couplepp ──────────────────────────────────────────────────────────
cmd({ pattern: 'couplepp', desc: 'Random couple profile pictures', category: 'search', filename: __filename },
async (conn, mek, m, { from, reply }) => {
  try {
    const res = await fetch('https://raw.githubusercontent.com/iamriz7/kopel_/main/kopel.json');
    const anu = await res.json();
    const random = anu[Math.floor(Math.random() * anu.length)];
    await conn.sendMessage(from, { image: { url: random.male }, caption: '💙 *Couple Male Profile*' }, { quoted: mek });
    await conn.sendMessage(from, { image: { url: random.female }, caption: '💗 *Couple Female Profile*' }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── image ──────────────────────────────────────────────────────────────
cmd({ pattern: 'image', alias: ['img', 'pic'], desc: 'Search and send images', category: 'search', filename: __filename },
async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('*Provide a search query!*\nExample: /image sunset');
    const [query, countStr] = q.split('|').map(s => s.trim());
    const count = parseInt(countStr) || 3;
    const params = { q: query, tbm: 'isch', hl: 'en', gl: 'in', ijn: '0' };
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36' };
    const res = await axios.get('https://www.google.com/search', { headers, params });
    let body = res.data;
    body = body.slice(body.lastIndexOf('AF_initDataCallback'));
    body = body.slice(body.indexOf('['));
    body = body.slice(0, body.indexOf('</script>') - 1);
    body = body.slice(0, body.lastIndexOf(','));
    const img = JSON.parse(body);
    const imgObjects = img[56][1][0][0][1][0];
    const urls = [];
    for (let i = 0; i < Math.min(count, imgObjects.length); i++) {
      if (imgObjects[i]?.[0]?.[0]?.['444383007']?.[1]?.[3]?.[0]) {
        urls.push(imgObjects[i][0][0]['444383007'][1][3][0]);
      }
    }
    if (!urls.length) return reply('*No images found.*');
    for (const url of urls) {
      try {
        await conn.sendMessage(from, { image: { url }, caption: `🔍 *${query}*` }, { quoted: mek });
      } catch {}
    }
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
