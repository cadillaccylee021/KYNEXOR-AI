'use strict';
const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

// ── helpers ──────────────────────────────────────────────────────────
async function animate(conn, from, mek, frames, delay = 700) {
  const sent = await conn.sendMessage(from, { text: frames[0] }, { quoted: mek });
  for (let i = 1; i < frames.length; i++) {
    await sleep(delay);
    try {
      await conn.sendMessage(from, { text: frames[i], edit: sent.key });
    } catch {}
  }
}

// ── hrt ──────────────────────────────────────────────────────────────
cmd({ pattern: 'hrt', alias: ['hearts'], desc: 'Animated hearts', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['💖','💗','💕','🩷','💛','💚','🩵','💙','💜','🖤','🤍','❤️‍🔥','💞','💓','💘','💝','♥️','❤️'];
  const txt = q || '#asta';
  await animate(conn, from, mek, emojis.map(e => `${txt.replace(/#\w+/g, e)}`), 800);
});

// ── joy ──────────────────────────────────────────────────────────────
cmd({ pattern: 'joy', desc: 'Joyful emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😃','😄','😁','😊','😎','🥳','😸','😹','🌞','🌈'];
  const txt = q || '✨';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 500);
});

// ── sad ──────────────────────────────────────────────────────────────
cmd({ pattern: 'sad', desc: 'Sad emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['🥺','😟','😕','😖','😫','🙁','😩','😥','😓','😪','😢','😔','😞','😭','💔','😿'];
  const txt = q || '😞';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 700);
});

// ── angry ─────────────────────────────────────────────────────────────
cmd({ pattern: 'angry', desc: 'Angry emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😡','😠','🤬','😤','😾','😡','😠','🤬','😤','😾'];
  const txt = q || '😤';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 500);
});

// ── shy ──────────────────────────────────────────────────────────────
cmd({ pattern: 'shy', desc: 'Shy emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😳','😊','😶','🙈','🙊','😳','😊','😶','🙈','🙊'];
  const txt = q || '😊';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 500);
});

// ── conf ──────────────────────────────────────────────────────────────
cmd({ pattern: 'conf', desc: 'Confused emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😕','😟','😵','🤔','😖','😲','😦','🤷','🤷‍♂️','🤷‍♀️'];
  const txt = q || '🤔';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 500);
});

// ── bored ─────────────────────────────────────────────────────────────
cmd({ pattern: 'bored', desc: 'Bored emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😑','😐','😒','😴','😞','😔','😕','🙁','😩','😫','😖'];
  const txt = q || '😑';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 800);
});

// ── frust ─────────────────────────────────────────────────────────────
cmd({ pattern: 'frust', desc: 'Frustrated emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['😤','😡','😠','🤬','😖','😒','😩','😤','😡','😠'];
  const txt = q || '😤';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 800);
});

// ── luv ──────────────────────────────────────────────────────────────
cmd({ pattern: 'luv', desc: 'Love emoji animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from, q }) => {
  const emojis = ['❤️','💕','😻','🧡','💛','💚','💙','💜','🖤','❣️','💞','💓','💗','💖','💘','💝','💟','♥️','💌'];
  const txt = q || '✨';
  await animate(conn, from, mek, emojis.map(e => `${txt} ${e}`), 800);
});

// ── solar ─────────────────────────────────────────────────────────────
cmd({ pattern: 'solar', desc: 'Solar system animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from }) => {
  const frames = [
    '◼️◼️◼️◼️◼️\n◼️◼️◼️◼️☀\n◼️◼️🌎◼️◼️\n🌕◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◼️◼️◼️◼️◼️\n🌕◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️☀\n◼️◼️◼️◼️◼️',
    '◼️🌕◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️☀◼️',
    '◼️◼️◼️🌕◼️\n◼️◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️◼️\n◼️☀◼️◼️◼️',
    '◼️◼️◼️◼️◼️\n◼️◼️◼️◼️🌕\n◼️◼️🌎◼️◼️\n☀◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◼️◼️◼️◼️◼️\n☀◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️🌕\n◼️◼️◼️◼️◼️',
    '◼️☀◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️🌕◼️',
    '◼️◼️◼️☀◼️\n◼️◼️◼️◼️◼️\n◼️◼️🌎◼️◼️\n◼️◼️◼️◼️◼️\n◼️🌕◼️◼️◼️',
  ];
  const loop = [...frames, ...frames, ...frames];
  await animate(conn, from, mek, loop, 150);
});

// ── snake ─────────────────────────────────────────────────────────────
cmd({ pattern: 'snake', desc: 'Snake animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from }) => {
  const frames = [
    '◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◻️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◻️◻️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '‎◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◼️\n◼️◼️◼️◼️◼️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◼️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◻️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◼️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◼️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◼️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◻️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◻️◻️\n◻️◼️◼️◻️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◻️◻️\n◻️◼️◻️◻️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◼️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️\n◻️◻️◻️◻️◻️',
    '◻️◻️◻️◻️◻️\n◻️◼️◻️◼️◻️\n◻️◻️◻️◻️◻️\n◻️◼️◼️◼️◻️\n◻️◻️◻️◻️◻️',
  ];
  await animate(conn, from, mek, frames, 400);
});

// ── plane ─────────────────────────────────────────────────────────────
cmd({ pattern: 'plane', desc: 'Plane flying animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from }) => {
  const frames = Array.from({ length: 14 }, (_, i) => {
    const dash = '-'.repeat(i);
    const rest = '-'.repeat(13 - i);
    return `---------------\n${dash}✈${rest}\n---------------`;
  });
  await animate(conn, from, mek, frames, 700);
});

// ── moon ──────────────────────────────────────────────────────────────
cmd({ pattern: 'moon', desc: 'Moon phase animation', category: 'fun', filename: __filename },
async (conn, mek, m, { from }) => {
  const phases = ['🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖'];
  await animate(conn, from, mek, phases.map(p => `${p} Moon Phases ${p}`), 700);
});
