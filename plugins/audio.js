// plugins/audioeffects.js — bass, blown, deep, earrape, fast, fat, nightcore, reverse, robot, slow, smooth, tupai
'use strict';
const { exec }  = require('child_process');
const fs        = require('fs');
const path      = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd }   = require('../command');
const ffmpeg    = process.env.FFMPEG_PATH || require('ffmpeg-static');

// ── ffmpeg filter map ─────────────────────────────────────────────────────────
const FILTERS = {
  bass:      '-af equalizer=f=54:width_type=o:width=2:g=20',
  blown:     '-af acrusher=.1:1:64:0:log',
  deep:      '-af atempo=4/4,asetrate=44500*2/3',
  earrape:   '-af volume=12',
  fast:      '-filter:a "atempo=1.63,asetrate=44100"',
  fat:       '-filter:a "atempo=1.6,asetrate=22100"',
  nightcore: '-filter:a atempo=1.06,asetrate=44100*1.25',
  reverse:   '-filter_complex "areverse"',
  robot:     '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"',
  slow:      '-filter:a "atempo=0.7,asetrate=44100"',
  smooth:    '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"',
  tupai:     '-filter:a "atempo=0.5,asetrate=65100"',
};

// ── shared audio editor ───────────────────────────────────────────────────────
async function audioEditor(conn, mek, m, { from, reply }, effect) {
  // Resolve quoted audio
  const ctx = mek.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return reply('*Reply to an audio or voice note!* 👸❤️');

  const audioType = ['audioMessage'].find(t => ctx.quotedMessage[t]);
  if (!audioType) return reply('*Reply to an audio message!*');

  const filter  = FILTERS[effect];
  const tmpDir  = path.join(process.env.TMPDIR || '/tmp');
  const inFile  = path.join(tmpDir, `ae_in_${Date.now()}.mp3`);
  const outFile = path.join(tmpDir, `ae_out_${Date.now()}_${effect}.mp3`);

  try {
    await reply(`_Processing ${effect} effect... 🎵_`);

    // Download audio
    const target = {
      key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
      message: ctx.quotedMessage
    };
    const buffer = await downloadMediaMessage(target, 'buffer', {}, {
      logger: undefined, reuploadRequest: conn.updateMediaMessage
    });
    fs.writeFileSync(inFile, buffer);

    // Run ffmpeg
    await new Promise((resolve, reject) => {
      exec(`"${ffmpeg}" -y -i "${inFile}" ${filter} "${outFile}"`, (err) => {
        try { fs.unlinkSync(inFile); } catch {}
        if (err) return reject(err);
        resolve();
      });
    });

    const audioBuffer = fs.readFileSync(outFile);
    try { fs.unlinkSync(outFile); } catch {}

    await conn.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      ptt: false,
    }, { quoted: mek });

  } catch (e) {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
    console.error(`audioeffects [${effect}] error:`, e.message);
    reply(`❌ Failed to apply ${effect} effect: ${e.message}`);
  }
}

// ── Register all 12 commands ──────────────────────────────────────────────────
const effects = Object.keys(FILTERS);

for (const effect of effects) {
  cmd({
    pattern: effect,
    desc: `Apply ${effect} effect to an audio`,
    category: 'audio',
    use: '<reply to audio>',
    filename: __filename,
  }, async (conn, mek, m, ctx) => {
    await audioEditor(conn, mek, m, ctx, effect);
  });
}
