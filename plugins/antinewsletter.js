// plugins/antinewsletter.js — uses botdb (replaces antitagSettings.json)
'use strict';

const { cmd }                                      = require('../command');
const { getFeature, setFeatureMode,
        incrementFeatureWarn, resetFeatureWarn,
        getGroupSettings }                         = require('../lib/botdb');

const FEATURE = 'antinewsletter';

// ── Setup (called from index.js after conn is open) ───────────────────────────
function registerAntiNewsletter(conn) {
  // No separate listener needed — handled via handleAntiNewsletter below
}

// ── Per-message handler (called from index.js messages.upsert) ───────────────
async function handleAntiNewsletter(conn, mek, { from, sender, groupMetadata, groupAdmins } = {}) {
  if (!from || !from.endsWith('@g.us')) return;

  const f = getFeature(from, FEATURE);
  if (!f.enabled || !f.mode || f.mode === 'off') return;

  // Detect newsletter / channel forward
  const isNewsletter =
    mek.message?.newsletterAdminInviteMessage ||
    mek.message?.listMessage?.listType === 2 ||
    (mek.key?.remoteJid?.includes('@newsletter')) ||
    (mek.message?.extendedTextMessage?.contextInfo?.remoteJid?.includes('@newsletter'));

  if (!isNewsletter) return;

  const isAdmin = Array.isArray(groupAdmins) && groupAdmins.some(a =>
    String(a).split(':')[0].split('@')[0] === String(sender).split(':')[0].split('@')[0]
  );
  if (isAdmin) return;

  try {
    await conn.sendMessage(from, { delete: mek.key }).catch(() => {});

    const mode      = f.mode;
    const settings  = getGroupSettings(from);
    const warnLimit = settings.warn_limit || 3;

    if (mode === 'delete') {
      // already deleted
    } else if (mode === 'warn') {
      const count = incrementFeatureWarn(from, FEATURE, sender);
      await conn.sendMessage(from, {
        text: `⚠️ @${sender.split('@')[0]} — No newsletter forwards allowed!\nWarning: ${count}/${warnLimit}`,
        mentions: [sender]
      }).catch(() => {});
      if (count >= warnLimit) {
        await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
        await conn.sendMessage(from, {
          text: `👢 @${sender.split('@')[0]} removed for repeated newsletter forwards.`,
          mentions: [sender]
        }).catch(() => {});
        resetFeatureWarn(from, FEATURE, sender);
      }
    } else if (mode === 'kick') {
      await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
      await conn.sendMessage(from, {
        text: `👢 @${sender.split('@')[0]} removed for forwarding newsletter content.`,
        mentions: [sender]
      }).catch(() => {});
    }
  } catch (err) {
    console.error('antinewsletter error:', err);
  }
}

// ── Command ───────────────────────────────────────────────────────────────────
cmd({
  pattern: 'antinewsletter',
  desc: 'Configure anti-newsletter mode: delete | warn | kick | off',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup)  return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('⚠️ Admins only.');

  const f = getFeature(from, FEATURE);
  if (!args[0]) return reply(`Current anti-newsletter mode: *${f.mode || 'off'}*`);

  const mode = args[0].toLowerCase();
  if (!['delete','warn','kick','off'].includes(mode))
    return reply('Options: delete | warn | kick | off');

  setFeatureMode(from, FEATURE, mode);
  return reply(`✅ Anti-newsletter set to: *${mode}*`);
});

module.exports = { registerAntiNewsletter, handleAntiNewsletter };
