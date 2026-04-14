// plugins/groupMessages.js — Group participant events (welcome/goodbye/promote/demote)
// Welcome & goodbye settings now stored in unified SQLite via lib/botdb.js

'use strict';

const { cmd }    = require('../command');
const botdb      = require('../lib/botdb');
const { getFeature, setFeature } = require('../lib/botdb');
const { lidToPhone } = require('../lib/lid');

function getParticipantId(p) {
  if (!p) return 'unknown';
  if (typeof p === 'string')             return p.split('@')[0];
  if (typeof p === 'object' && p.id)     return p.id.split('@')[0];
  return 'unknown';
}

// ── Strip ALL formatting from a JID to pure digits for comparison ─────
// Handles: "27751014718:5@s.whatsapp.net", "27751014718@lid", plain digits
function toDigits(jid) {
  if (!jid) return '';
  return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
}

function registerGroupMessages(conn) {

  // ── Cooldown set: tracks JIDs the bot just acted on ────────────────
  // Key: `${groupId}|${jid}|${action}` — expires after 8 seconds
  // This prevents the bot's own promote/demote from triggering the handler
  const botActed = new Set();
  function markBotAction(groupId, jid, action) {
    const key = `${groupId}|${toDigits(jid)}|${action}`;
    botActed.add(key);
    setTimeout(() => botActed.delete(key), 8000);
  }
  function isBotCooldown(groupId, jid, action) {
    return botActed.has(`${groupId}|${toDigits(jid)}|${action}`);
  }

  conn.ev.on('group-participants.update', async (update) => {
    const { id: groupId, action, participants, author } = update;
    if (!groupId || !participants?.length) return;

    // ── Get bot number (digits only, no suffix) ───────────────────────
    const botDigits    = toDigits(conn.user?.id || '');
    const authorDigits = toDigits(author || '');

    // ── Is this event caused by the bot itself? ───────────────────────
    // Check 1: author JID matches bot number
    // Check 2: cooldown set (catches race conditions where author JID is missing)
    const isBotAuthor = botDigits && authorDigits && authorDigits === botDigits;

    let groupName = groupId;
    try {
      const meta = await conn.groupMetadata(groupId);
      groupName = meta?.subject || groupId;
    } catch (_) {}

    const now = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' });

    // ── Welcome ───────────────────────────────────────────────────────
    if (action === 'add') {
      const settings = botdb.getGreetings(groupId);
      if (settings.welcome_enabled) {
        const tpl = settings.welcome_msg || "Welcome @{user} to {group}! We're glad to have you 🎉";
        for (const participant of participants) {
          const userNum = getParticipantId(participant);
          const msg = tpl
            .replace(/@\{user\}|\{user\}/gi, `@${userNum}`)
            .replace(/\{group\}/gi, groupName);
          let dp = 'https://files.catbox.moe/49gzva.png';
          try { dp = await conn.profilePictureUrl(participant, 'image'); } catch (_) {}
          await conn.sendMessage(groupId, {
            image: { url: dp }, caption: msg, mentions: [participant]
          }).catch(() =>
            conn.sendMessage(groupId, { text: msg, mentions: [participant] })
          );
        }
      }
    }

    // ── Goodbye ───────────────────────────────────────────────────────
    if (action === 'remove') {
      const settings = botdb.getGreetings(groupId);
      if (settings.goodbye_enabled) {
        const tpl = settings.goodbye_msg || "Goodbye @{user} from {group}. We'll miss you! 👋";
        for (const participant of participants) {
          const userNum = getParticipantId(participant);
          const msg = tpl
            .replace(/@\{user\}|\{user\}/gi, `@${userNum}`)
            .replace(/\{group\}/gi, groupName);
          let dp = 'https://files.catbox.moe/49gzva.png';
          try { dp = await conn.profilePictureUrl(participant, 'image'); } catch (_) {}
          await conn.sendMessage(groupId, {
            image: { url: dp }, caption: msg, mentions: [participant]
          }).catch(() =>
            conn.sendMessage(groupId, { text: msg, mentions: [participant] })
          );
        }
      }
    }

    // ── Anti-Promote ──────────────────────────────────────────────────
    if (action === 'promote') {
      // Skip entirely if the bot triggered this event
      const participantDigits = toDigits(
        typeof participants[0] === 'string' ? participants[0] : participants[0]?.id
      );
      if (isBotAuthor || isBotCooldown(groupId, participantDigits, 'promote')) {
        // Bot's own promotion — just show announcement, no reversal
      } else {
        const feat = getFeature(groupId, 'antipromote');
        if (feat && feat.enabled) {
          for (const participant of participants) {
            const participantJid = typeof participant === 'string' ? participant : participant.id;
            const actorNum  = authorDigits;
            const targetNum = toDigits(participantJid);

            // Mark cooldowns BEFORE acting so echoed events are caught
            markBotAction(groupId, participantJid, 'demote'); // bot will demote participant
            if (author) markBotAction(groupId, author, 'demote'); // bot will demote actor

            try { await conn.groupParticipantsUpdate(groupId, [participantJid], 'demote'); } catch {}
            if (author) {
              try { await conn.groupParticipantsUpdate(groupId, [author], 'demote'); } catch {}
            }

            await conn.sendMessage(groupId, {
              text:
                `🚫 *Anti-Promote Active*\n\n` +
                `@${actorNum} tried to promote @${targetNum}.\n\n` +
                `• @${targetNum} has been *demoted back*.\n` +
                `• @${actorNum} has been *demoted* as punishment.`,
              mentions: [author, participantJid].filter(Boolean)
            }).catch(() => {});
          }
          return; // skip promotion announcement
        }
      }
    }

    // ── Promote announcement ──────────────────────────────────────────
    if (action === 'promote') {
      const celebrationMsgs = [
        "New admin in the house! 🎉", "The throne has a new ruler! 👑",
        "Power upgrade complete! ⚡", "A new sheriff in town! 🤠",
        "Leadership level unlocked! 🏅", "Admin powers activated! 💫"
      ];
      const actorTag = author ? `@${getParticipantId(author)}` : 'system';
      for (const participant of participants) {
        const userTag = `@${getParticipantId(participant)}`;
        const msg = `╔════════════════════╗\n║  🎖️ 𝗣𝗥𝗢𝗠𝗢𝗧𝗜𝗢𝗡  🎖️  ║\n╠════════════════════╣\n║ 𝗨𝘀𝗲𝗿: ${userTag}\n║ 𝗕𝘆:   ${actorTag}\n║ 𝗧𝗶𝗺𝗲: ${now}\n╚════════════════════╝\n${celebrationMsgs[Math.floor(Math.random() * celebrationMsgs.length)]}`;
        await conn.sendMessage(groupId, {
          text: msg, mentions: [participant, ...(author ? [author] : [])]
        }).catch(() => {});
      }
    }

    // ── Anti-Demote ───────────────────────────────────────────────────
    if (action === 'demote') {
      const participantDigits = toDigits(
        typeof participants[0] === 'string' ? participants[0] : participants[0]?.id
      );
      if (isBotAuthor || isBotCooldown(groupId, participantDigits, 'demote')) {
        // Bot's own demotion — just show announcement, no reversal
      } else {
        const feat = getFeature(groupId, 'antidemote');
        if (feat && feat.enabled) {
          for (const participant of participants) {
            const participantJid = typeof participant === 'string' ? participant : participant.id;
            const actorNum  = authorDigits;
            const targetNum = toDigits(participantJid);

            // Mark cooldowns BEFORE acting
            markBotAction(groupId, participantJid, 'promote'); // bot will promote participant back
            if (author) markBotAction(groupId, author, 'demote'); // bot will demote actor

            try { await conn.groupParticipantsUpdate(groupId, [participantJid], 'promote'); } catch {}
            if (author) {
              try { await conn.groupParticipantsUpdate(groupId, [author], 'demote'); } catch {}
            }

            await conn.sendMessage(groupId, {
              text:
                `🚫 *Anti-Demote Active*\n\n` +
                `@${actorNum} tried to demote @${targetNum}.\n\n` +
                `• @${targetNum} has been *re-promoted*.\n` +
                `• @${actorNum} has been *demoted* as punishment.`,
              mentions: [author, participantJid].filter(Boolean)
            }).catch(() => {});
          }
          return; // skip demotion announcement
        }
      }
    }

    // ── Demote announcement ───────────────────────────────────────────
    if (action === 'demote') {
      const sympathyMsgs = [
        "The crown has been removed... 👑➡️🧢", "Admin powers revoked! ⚡➡️💤",
        "Back to civilian life! 🎖️➡️👕", "Admin status: REVOKED ❌"
      ];
      const actorTag = author ? `@${getParticipantId(author)}` : 'system';
      for (const participant of participants) {
        const userTag = `@${getParticipantId(participant)}`;
        const msg = `╔════════════════════╗\n║  ⚠️ 𝗗𝗘𝗠𝗢𝗧𝗜𝗢𝗡  ⚠️  ║\n╠════════════════════╣\n║ 𝗨𝘀𝗲𝗿: ${userTag}\n║ 𝗕𝘆:   ${actorTag}\n║ 𝗧𝗶𝗺𝗲: ${now}\n╚════════════════════╝\n${sympathyMsgs[Math.floor(Math.random() * sympathyMsgs.length)]}`;
        await conn.sendMessage(groupId, {
          text: msg, mentions: [participant, ...(author ? [author] : [])]
        }).catch(() => {});
      }
    }
  });
}

// ── Toggle commands ───────────────────────────────────────────────────────────

cmd({
  pattern: 'antipromote',
  desc: 'Prevent unauthorized promotions — reverses the action automatically',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('🚫 Admins only.');

  const opt     = (args[0] || '').toLowerCase();
  const feat    = getFeature(from, 'antipromote');
  const current = feat && feat.enabled;

  if (!opt) {
    return reply(
      `🛡️ *Anti-Promote*\n\n` +
      `Status: *${current ? 'ON ✅' : 'OFF ❌'}*\n\n` +
      `Usage:\n• /antipromote on\n• /antipromote off`
    );
  }
  if (opt === 'on')  { setFeature(from, 'antipromote', 1); return reply('✅ *Anti-Promote enabled.*\nAny unauthorized promotion will be automatically reversed.'); }
  if (opt === 'off') { setFeature(from, 'antipromote', 0); return reply('❌ *Anti-Promote disabled.*'); }
  return reply('Usage: /antipromote on | off');
});

cmd({
  pattern: 'antidemote',
  desc: 'Prevent unauthorized demotions — reverses the action automatically',
  category: 'group',
  filename: __filename,
}, async (conn, mek, m, { from, args, reply, isGroup, isAdmins, isOwner, isSudo }) => {
  if (!isGroup) return reply('🚫 Groups only.');
  if (!isAdmins && !isOwner && !isSudo) return reply('🚫 Admins only.');

  const opt     = (args[0] || '').toLowerCase();
  const feat    = getFeature(from, 'antidemote');
  const current = feat && feat.enabled;

  if (!opt) {
    return reply(
      `🛡️ *Anti-Demote*\n\n` +
      `Status: *${current ? 'ON ✅' : 'OFF ❌'}*\n\n` +
      `Usage:\n• /antidemote on\n• /antidemote off`
    );
  }
  if (opt === 'on')  { setFeature(from, 'antidemote', 1); return reply('✅ *Anti-Demote enabled.*\nAny unauthorized demotion will be automatically reversed.'); }
  if (opt === 'off') { setFeature(from, 'antidemote', 0); return reply('❌ *Anti-Demote disabled.*'); }
  return reply('Usage: /antidemote on | off');
});

module.exports = { registerGroupMessages };
