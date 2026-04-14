
// plugins/attp.js — Animated blinking text sticker
'use strict';
const { spawn } = require('child_process');
const { cmd }   = require('../command');
const { writeExifVid } = require('../lib/exifUtils');

cmd({
  pattern: 'attp',
  alias: ['ttp'],
  desc: 'Create animated blinking text sticker',
  category: 'sticker',
  filename: __filename,
}, async (conn, mek, m, { args, from, reply }) => {
  const text = args.join(' ').trim();
  if (!text) return reply('❌ Provide text!\nExample: :attp Hello World');
  if (text.length > 50) return reply('❌ Max 50 characters.');

  try {
    const mp4Buffer  = await renderBlinkingVideo(text);
    const webpBuffer = await writeExifVid(mp4Buffer, { packname: 'Queen Kylie V1' });
    await conn.sendMessage(from, { sticker: webpBuffer }, { quoted: mek });
  } catch (e) {
    console.error('attp error:', e.message);
    reply('❌ Failed to generate animated sticker: ' + e.message);
  }
});

function escapeDrawtext(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%');
}

function renderBlinkingVideo(text) {
  return new Promise((resolve, reject) => {
    const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
    const safe = escapeDrawtext(text);
    const dur  = 1.8;
    const cycle = 0.3;

    // Build three drawtext filters: red blinks, then blue, then green
    const base = `fontfile='${font}':text='${safe}':borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2`;
    const red   = `drawtext=${base}:fontcolor=red:enable='lt(mod(t,${cycle}),0.1)'`;
    const blue  = `drawtext=${base}:fontcolor=blue:enable='between(mod(t,${cycle}),0.1,0.2)'`;
    const green = `drawtext=${base}:fontcolor=green:enable='gte(mod(t,${cycle}),0.2)'`;
    const filter = `${red},${blue},${green}`;

    const ff = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=black:s=512x512:d=${dur}:r=20`,
      '-vf', filter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart+frag_keyframe+empty_moov',
      '-t', String(dur),
      '-f', 'mp4',
      'pipe:1'
    ]);

    const chunks = [], errs = [];
    ff.stdout.on('data', d => chunks.push(d));
    ff.stderr.on('data', e => errs.push(e));
    ff.on('error', err => reject(new Error('ffmpeg not found: ' + err.message)));
    ff.on('close', code => {
      if (code === 0) return resolve(Buffer.concat(chunks));
      reject(new Error(Buffer.concat(errs).toString().slice(-300)));
    });
  });
}
