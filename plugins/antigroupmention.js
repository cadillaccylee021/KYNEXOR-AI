// plugins/antigroupmention.js — uses botdb (replaces antigroupmention.json)
'use strict';

const { cmd }                                                   = require('../command');
const { getFeature, setFeature, incrementFeatureWarn,
        resetFeatureWarn, getFeatureWarn, getGroupSettings }    = require('../lib/botdb');

const FEATURE   = 'antigroupmention';

// ── Toggle command ────────────────────────────────────────────────────────────
cmd({
  pattern: 'antigroupmention',
  desc: 'Enable/Disable anti group status mention',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, isSudo, reply }) => {
  if (!isGroup) return reply('❌ Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('❌ Admins only.');

  const f = getFeature(from, FEATURE);

  if (!args[0]) {
    return reply(`🔘 AntiGroupMention is *${f.enabled ? 'ON' : 'OFF'}*`);
  }

  const opt = args[0].toLowerCase();
  if (opt === 'on') {
    setFeature(from, FEATURE, true, '');
    return reply('✅ AntiGroupMention enabled.');
  }
  if (opt === 'off') {
    setFeature(from, FEATURE, false, '');
    return reply('❌ AntiGroupMention disabled.');
  }
  return reply('Use: antigroupmention on/off');
});

// ── Handler (called from index.js per-message) ────────────────────────────────
async function handleAntiGroupMention(conn, mek, context) {
  const { from, sender, isGroup, isAdmins, isOwner, isSudo, isBotAdmins } = context;
  if (!isGroup) return;

  const f = getFeature(from, FEATURE);
  if (!f.enabled) return;
  if (!mek.message) return;
  if (isAdmins || isOwner || isSudo) return;

  // Detect group status mention
  const isGroupStatusMention =
    !!mek.message.groupStatusMentionMessage ||
    (mek.message.protocolMessage && mek.message.protocolMessage.type === 25);

  if (!isGroupStatusMention) return;

  try {
    await conn.sendMessage(from, { delete: mek.key }).catch(() => {});

    const settings  = getGroupSettings(from);
    const warnLimit = settings.warn_limit || 3;
    const count     = incrementFeatureWarn(from, FEATURE, sender);

    await conn.sendMessage(from, {
      text: `⚠️ @${sender.split('@')[0]} warned for group status mention.\nWarning: ${count}/${warnLimit}`,
      mentions: [sender]
    }).catch(() => {});

    if (count >= warnLimit) {
      if (isBotAdmins) {
        await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
        await conn.sendMessage(from, {
          text: `🚫 @${sender.split('@')[0]} removed after ${warnLimit} warnings.`,
          mentions: [sender]
        }).catch(() => {});
      } else {
        await conn.sendMessage(from, { text: '⚠️ I need admin rights to remove users.' }).catch(() => {});
      }
      resetFeatureWarn(from, FEATURE, sender);
    }
  } catch (err) {
    console.error('AntiGroupMention error:', err);
  }
}

module.exports = { handleAntiGroupMention };
