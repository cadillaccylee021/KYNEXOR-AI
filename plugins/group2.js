'use strict';
const { cmd } = require('../command');
const config = require('../config');

const P = config.PREFIX || '/';

// ── ginfo ─────────────────────────────────────────────────────────────
cmd({
  pattern: 'ginfo',
  desc: 'Get group info from an invite link',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    const match = (q || '').match(/https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]{22})/);
    if (!match) return reply(`*Provide a valid WhatsApp group link!*\nExample: ${P}ginfo https://chat.whatsapp.com/...`);
    const info = await conn.groupGetInviteInfo(match[1]);
    if (!info) return reply('*Group not found or link has expired.*');
    const created = new Date(info.creation * 1000).toISOString().split('T')[0];
    await conn.sendMessage(from, {
      text: `👥 *${info.subject}*\n\n` +
            `👤 *Creator:* wa.me/${(info.owner || '').split('@')[0]}\n` +
            `🆔 *JID:* ${info.id}\n` +
            `🔇 *Muted:* ${info.announce ? 'Yes' : 'No'}\n` +
            `🔒 *Locked:* ${info.restrict ? 'Yes' : 'No'}\n` +
            `📅 *Created:* ${created}\n` +
            `👥 *Members:* ${info.size}` +
            (info.desc ? `\n📝 *Description:* ${info.desc}` : '') +
            `\n\n🔗 ${match[0]}`
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── setdesc ───────────────────────────────────────────────────────────
cmd({
  pattern: 'setdesc',
  alias: ['setgdesc', 'gdesc'],
  desc: 'Set the group description',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    if (!q) return reply(`*Example:* ${P}setdesc Welcome to the group!`);
    await conn.groupUpdateDescription(from, q);
    reply('✅ *Group description updated!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── setgname ──────────────────────────────────────────────────────────
cmd({
  pattern: 'setgname',
  alias: ['setname', 'gname'],
  desc: 'Set the group name',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    if (!q) return reply(`*Example:* ${P}setgname My Group Name`);
    await conn.groupUpdateSubject(from, q);
    reply('✅ *Group name updated!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── gpp ───────────────────────────────────────────────────────────────
cmd({
  pattern: 'gpp',
  desc: 'Set the group profile picture (reply to an image)',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    if (!m.quoted) return reply('*Reply to an image!*');
    // Use m.quoted.getbuff — the correct queen kylie download method
    let buf;
    try { buf = await m.quoted.getbuff; } catch {}
    if (!buf) try { buf = await m.quoted.download(); } catch {}
    if (!buf) return reply('*Could not download the image. Make sure you reply to an image.*');
    await conn.updateProfilePicture(from, buf);
    reply('✅ *Group picture updated!*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── lock / unlock ─────────────────────────────────────────────────────
cmd({
  pattern: 'lock',
  desc: 'Lock group settings to admins only',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    await conn.groupSettingUpdate(from, 'locked');
    reply('🔒 *Group locked! Only admins can change group settings.*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

cmd({
  pattern: 'unlock',
  desc: 'Unlock group settings for everyone',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    await conn.groupSettingUpdate(from, 'unlocked');
    reply('🔓 *Group unlocked! Everyone can change group settings.*');
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── kik ───────────────────────────────────────────────────────────────
/*cmd({
  pattern: 'kik',
  desc: 'Kick all members from a specific country code',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isBotAdmins, isOwner, participants, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    if (!args[0]) return reply(`*Provide a country code!*\nExample: ${P}kik 212`);
    const cc = args[0].replace('+', '');
    const adminIds = participants.filter(p => p.admin).map(p => p.id);
    let kicked = 0;
    for (const p of participants) {
      if (p.id.startsWith(cc) && !adminIds.includes(p.id) && p.id !== conn.user.id.split(':')[0] + '@s.whatsapp.net') {
        try { await conn.groupParticipantsUpdate(from, [p.id], 'remove'); kicked++; } catch {}
      }
    }
    reply(kicked === 0
      ? `*No non-admin members found with country code +${cc}!*`
      : `✅ *Kicked ${kicked} member(s) with country code +${cc}!*`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── num ───────────────────────────────────────────────────────────────
cmd({
  pattern: 'num',
  desc: 'List all members from a specific country code',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, isOwner, isSudo, participants, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!args[0]) return reply(`*Provide a country code!*\nExample: ${P}num 27`);
    const cc = args[0];
    const found = participants.filter(p => p.id.startsWith(cc));
    if (!found.length) return reply(`*No members with country code +${cc}!*`);
    let txt = `📋 *Members with +${cc} (${found.length}):*\n\n`;
    found.forEach((p, i) => { txt += `${i + 1}. wa.me/${p.id.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
*/
// ── kik ───────────────────────────────────────────────────────────────
cmd({
  pattern: 'kik',
  desc: 'Kick all members from a specific country code',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isOwner, isSudo, groupMetadata, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    
    let cc = (q || '').replace(/[^0-9]/g, '');
    if (!cc) return reply(`*Provide a valid country code!*\nExample: ${P}kik 234`);
    
    const participants = groupMetadata?.participants || [];
    if (participants.length === 0) return reply(`*Error:* Group participant list is empty.`);
    
    const botJid = conn.user.id.split(':')[0];
    const { lidToPhone } = require('../lib/lid'); // Import your LID helper

    reply(`⏳ *Scanning ${participants.length} members for +${cc}. This might take a moment...*`);
    
    let targets = [];
    
    // Check every participant, decoding LIDs if necessary
    for (const p of participants) {
        let originalId = p.id || p.jid;
        let checkNumber = originalId;

        // If it's a hidden LID, decrypt it to the real phone number
        if (originalId.includes('@lid')) {
            checkNumber = await lidToPhone(conn, originalId);
        }

        // Clean up the number
        checkNumber = checkNumber.split('@')[0].split(':')[0];
        const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';

        // Check if the real number starts with the country code
        if (checkNumber.startsWith(cc) && !isAdmin && checkNumber !== botJid) {
            targets.push(originalId); // Push the original ID so WhatsApp knows who to kick
        }
    }

    if (targets.length === 0) {
        return reply(`*No non-admin members found matching country code +${cc}!*`);
    }

    reply(`⏳ *Found ${targets.length} member(s) with +${cc}. Kicking now...*`);
    
    let kicked = 0;
    for (const jid of targets) {
      try { 
          await conn.groupParticipantsUpdate(from, [jid], 'remove'); 
          kicked++; 
          await new Promise(res => setTimeout(res, 1000)); // Anti-ban delay
      } catch (err) {
          console.error(`Failed to kick ${jid}:`, err);
      }
    }
    
    reply(`✅ *Successfully kicked ${kicked}/${targets.length} member(s) with +${cc}!*`);
  } catch (e) { 
    console.error(e);
    reply(`❌ Error: Failed to process command. Ensure the bot is an admin.`); 
  }
});

// ── num ───────────────────────────────────────────────────────────────
cmd({
  pattern: 'num',
  desc: 'List all members from a specific country code',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isOwner, isSudo, groupMetadata, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    
    let cc = (q || '').replace(/[^0-9]/g, '');
    if (!cc) return reply(`*Provide a valid country code!*\nExample: ${P}num 234`);
    
    const participants = groupMetadata?.participants || [];
    if (participants.length === 0) return reply(`*Error:* Group participant list is empty.`);
    
    const { lidToPhone } = require('../lib/lid');

    reply(`⏳ *Scanning members for +${cc}...*`);
    
    let found = [];
    
    // Decode and check everyone
    for (const p of participants) {
        let originalId = p.id || p.jid;
        let checkNumber = originalId;

        if (originalId.includes('@lid')) {
            checkNumber = await lidToPhone(conn, originalId);
        }

        checkNumber = checkNumber.split('@')[0].split(':')[0];

        if (checkNumber.startsWith(cc)) {
            found.push(checkNumber);
        }
    }

    if (found.length === 0) {
        return reply(`*No members found matching country code +${cc}!*`);
    }
    
    let txt = `📋 *Members with +${cc} (${found.length}):*\n\n`;
    found.forEach((num, i) => { 
        txt += `${i + 1}. wa.me/${num}\n`; 
    });
    
    await conn.sendMessage(from, { text: txt }, { quoted: mek });
  } catch (e) { 
    reply(`❌ Error: ${e.message}`); 
  }
});

// ── poll ──────────────────────────────────────────────────────────────
cmd({
  pattern: 'poll',
  desc: 'Create a poll. Usage: /poll Question;Option1,Option2,Option3',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!q || !q.includes(';')) return reply(`*Example:* ${P}poll Best food?;Pizza,Burger,Pasta`);
    const [question, optStr] = q.split(';');
    const values = optStr.split(',').map(o => o.trim()).filter(Boolean);
    if (values.length < 2) return reply('*Provide at least 2 options!*');
    await conn.sendMessage(from, { poll: { name: question.trim(), values } });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── ship ──────────────────────────────────────────────────────────────
cmd({
  pattern: 'ship',
  desc: 'Matchmake yourself with a random or mentioned member',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, participants, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    // get mentioned or quoted target
    let target = m.quoted?.sender || null;
    if (!target) {
      try {
        for (const t of ['extendedTextMessage','imageMessage']) {
          const ctx = mek?.message?.[t]?.contextInfo;
          if (ctx?.mentionedJid?.[0]) { target = ctx.mentionedJid[0]; break; }
        }
      } catch {}
    }
    if (!target) {
      const others = participants.map(p => p.id).filter(id => id !== sender);
      target = others[Math.floor(Math.random() * others.length)];
    }
    if (sender === target) return reply('*You want to match with yourself? 😂*');
    const pct = Math.floor(Math.random() * 100);
    let note;
    if (pct < 25)      note = 'Still time to reconsider... 😅';
    else if (pct < 50) note = 'Not bad, I guess! 💫';
    else if (pct < 75) note = 'Stay together! ⭐';
    else if (pct < 90) note = 'You two will make a great couple 💖';
    else               note = 'Perfect match! 💙';
    await conn.sendMessage(from, {
      text: `❣️ *Matchmaking...*\n\n@${sender.split('@')[0]} ❤️ @${target.split('@')[0]}\n\n💯 *${pct}%* — ${note}`,
      mentions: [sender, target]
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── tagadmin ──────────────────────────────────────────────────────────
cmd({
  pattern: 'tagadmin',
  desc: 'Tag all group admins',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isOwner, isSudo, groupAdmins, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!groupAdmins?.length) return reply('*No admins found!*');
    let txt = `*👑 GROUP ADMINS*\n\n${q ? `📢 *Message:* ${q}\n\n` : ''}`;
    groupAdmins.forEach((id, i) => { txt += `${i + 1}. @${id.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: groupAdmins }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── attention ─────────────────────────────────────────────────────────
cmd({
  pattern: 'attention',
  react: '👸',
  desc: 'Tag everyone with a royal message',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isOwner, isSudo, participants, pushname, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    let txt = `🌟👑 *ROYAL GATHERING* 👑🌟\n\n` +
              `🎉 *Attention, esteemed members!*\n` +
              `✨ You are cordially invited to join the royal assembly!\n\n` +
              `➲ *Message:* ${q || 'No special message.'}\n` +
              `🛡️ *By:* ${pushname} 🔖\n\n👥 *Participants:*\n`;
    const ids = participants.map(p => p.id);
    ids.forEach(id => { txt += `🍀 @${id.split('@')[0]}\n`; });
    txt += '\n✨ Thank you for your presence! 🎊👑';
    await conn.sendMessage(from, { text: txt, mentions: ids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── broadcastall ──────────────────────────────────────────────────────
cmd({
  pattern: 'broadcastall',
  desc: 'Broadcast a message to all groups (owner only)',
  category: 'group',
  fromMe: true,
  filename: __filename
}, async (conn, mek, m, { q, isOwner, reply }) => {
  try {
    if (!isOwner) return reply('*Owner only!*');
    if (!q) return reply(`*Example:* ${P}broadcastall Hello everyone!`);
    const groups = await conn.groupFetchAllParticipating();
    const ids = Object.keys(groups);
    reply(`📡 *Broadcasting to ${ids.length} groups...*`);
    let sent = 0;
    for (const id of ids) {
      try { await conn.sendMessage(id, { text: `📢 *BROADCAST*\n\n${q}` }); sent++; } catch {}
    }
    reply(`✅ *Broadcast sent to ${sent}/${ids.length} groups!*`);
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── getjids ───────────────────────────────────────────────────────────
cmd({
  pattern: 'getjids',
  alias: ['gjid', 'allgc', 'gclist'],
  desc: 'List all group JIDs and names (owner only)',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isOwner, reply }) => {
  try {
    if (!isOwner) return reply('*Owner only!*');
    const groups  = await conn.groupFetchAllParticipating();
    const entries = Object.entries(groups);
    const onlyJids  = (q || '').includes('jid');
    const onlyNames = (q || '').includes('name');
    let txt = `📋 *All Groups (${entries.length})*\n\n`;
    for (const [id, meta] of entries) {
      if (!onlyJids)  txt += `*Group:* ${meta.subject}  `;
      if (!onlyNames) txt += `*JID:* ${id}`;
      txt += '\n';
    }
    await conn.sendMessage(from, { text: txt }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── rejectall ─────────────────────────────────────────────────────────
cmd({
  pattern: 'rejectall',
  alias: ['rejectjoin'],
  desc: 'Reject all pending join requests',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    const list = await conn.groupRequestParticipantsList(from);
    if (!list?.length) return reply('*No pending join requests!*');
    const jids = [];
    for (const req of list) {
      try { await conn.groupRequestParticipantsUpdate(from, [req.jid], 'reject'); jids.push(req.jid); } catch {}
    }
    let txt = `✅ *Rejected ${jids.length} join request(s):*\n`;
    jids.forEach(jid => { txt += `• @${jid.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: jids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── acceptall ─────────────────────────────────────────────────────────
cmd({
  pattern: 'acceptall',
  alias: ['acceptjoin'],
  desc: 'Accept all pending join requests',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    const list = await conn.groupRequestParticipantsList(from);
    if (!list?.length) return reply('*No pending join requests!*');
    const jids = [];
    for (const req of list) {
      try { await conn.groupRequestParticipantsUpdate(from, [req.jid], 'approve'); jids.push(req.jid); } catch {}
    }
    let txt = `✅ *Accepted ${jids.length} join request(s):*\n`;
    jids.forEach(jid => { txt += `• @${jid.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: jids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── listrequest ───────────────────────────────────────────────────────
cmd({
  pattern: 'listrequest',
  alias: ['requestjoin'],
  desc: 'List all pending join requests',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isOwner, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!isAdmins && !isOwner && !isSudo) return reply('*Admins only!*');
    if (!isBotAdmins) return reply('*I need admin rights first!*');
    const list = await conn.groupRequestParticipantsList(from);
    if (!list?.length) return reply('*No pending join requests!*');
    const jids = list.map(r => r.jid);
    let txt = `📋 *Pending Join Requests (${jids.length}):*\n\n`;
    jids.forEach((jid, i) => { txt += `${i + 1}. @${jid.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: jids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── pick ──────────────────────────────────────────────────────────────
cmd({
  pattern: 'pick',
  desc: 'Pick a random group member',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isGroup, participants, reply }) => {
  try {
    if (!isGroup) return reply('*Groups only!*');
    if (!q) return reply(`*What type of person?*\nExample: ${P}pick most active`);
    const ids    = participants.map(p => p.id);
    const picked = ids[Math.floor(Math.random() * ids.length)];
    await conn.sendMessage(from, {
      text: `🎯 The most *${q}* person around us is @${picked.split('@')[0]}!`,
      mentions: [picked]
    }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── common ────────────────────────────────────────────────────────────
cmd({
  pattern: 'common',
  desc: 'Find common members between two groups (owner only)',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isOwner, reply }) => {
  try {
    if (!isOwner) return reply('*Owner only!*');
    const jids = (q || '').match(/\d+@g\.us/g);
    if (!jids || jids.length < 2) return reply(`*Provide 2 group JIDs!*\nExample: ${P}common 123@g.us 456@g.us`);
    const [g1, g2] = await Promise.all([conn.groupMetadata(jids[0]), conn.groupMetadata(jids[1])]);
    const common = g1.participants.filter(p => g2.participants.some(p2 => p2.id === p.id));
    if (!common.length) return reply('*No common members found!*');
    const ids = common.map(p => p.id);
    let txt = `🔗 *Common Members (${ids.length})*\n*${g1.subject}* ↔ *${g2.subject}*\n\n`;
    ids.forEach((id, i) => { txt += `${i + 1}. @${id.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: ids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// ── diff ──────────────────────────────────────────────────────────────
cmd({
  pattern: 'diff',
  desc: 'Members in group 1 but not in group 2 (owner only)',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { from, q, isOwner, reply }) => {
  try {
    if (!isOwner) return reply('*Owner only!*');
    const jids = (q || '').match(/\d+@g\.us/g);
    if (!jids || jids.length < 2) return reply(`*Provide 2 group JIDs!*`);
    const [g1, g2] = await Promise.all([conn.groupMetadata(jids[0]), conn.groupMetadata(jids[1])]);
    const diff = g1.participants.filter(p => !g2.participants.some(p2 => p2.id === p.id));
    if (!diff.length) return reply('*No unique members found!*');
    const ids = diff.map(p => p.id);
    let txt = `📊 *Members only in "${g1.subject}" (${ids.length}):*\n\n`;
    ids.forEach((id, i) => { txt += `${i + 1}. @${id.split('@')[0]}\n`; });
    await conn.sendMessage(from, { text: txt, mentions: ids }, { quoted: mek });
  } catch (e) { reply(`❌ Error: ${e.message}`); }
});
