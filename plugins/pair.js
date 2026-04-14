// plugins/pair.js — Owner-only pairing command
// Usage: /pair 2348012345678
'use strict';
const axios = require('axios');
const { cmd } = require('../command');

// URL of your Queen Kylie V1 pairing server
const PAIR_SERVER = process.env.PAIR_SERVER_URL || 'https://repo-jjl7.onrender.com';

// Prevent duplicate requests
const pendingSessions = new Map();
setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, v] of pendingSessions) {
        if (v.ts < cutoff) pendingSessions.delete(k);
    }
}, 10 * 60 * 1000);

cmd({
    pattern: 'pair',
    alias: ['getpair', 'getsession', 'pairsession'],
    desc: 'Generate a Queen Kylie V1 session pairing code for a number',
    category: 'owner',
    react: '🔗',
    filename: __filename,
}, async (conn, mek, m, { q, reply, isOwner, from }) => {
    if (!isOwner) return reply('❌ This command is for the bot owner only.');

    const rawNumber = (q || '').trim().replace(/\D/g, '');

    if (!rawNumber || rawNumber.length < 10) {
        return reply(
            `*🔗 QUEEN KYLIE V1 — PAIR SESSION*\n\n` +
            `Generate a pairing code for any WhatsApp number.\n\n` +
            `*Usage:* \`/pair 2348012345678\`\n` +
            `*Format:* Country code + number, digits only.\n\n` +
            `_The user will also receive their session ID in DMs once linked._`
        );
    }

    if (rawNumber.length > 15) {
        return reply('❌ Invalid number. Include country code e.g. `2348012345678`');
    }

    if (pendingSessions.has(rawNumber)) {
        return reply(`⚠️ A pairing request is already running for *+${rawNumber}*. Please wait.`);
    }

    pendingSessions.set(rawNumber, { ts: Date.now() });
    await reply(`⏳ Generating pairing code for *+${rawNumber}*...`);

    try {
        const res = await axios.get(`${PAIR_SERVER}/code?number=${rawNumber}`, { timeout: 30000 });
        const { code } = res.data;

        if (!code) throw new Error('No code returned from server');

        const formatted = code.replace(/(.{4})(?=.)/g, '$1-');

        await reply(
            `*✅ PAIRING CODE GENERATED*\n\n` +
            `*Number:* +${rawNumber}\n` +
            `*Code:* \`${formatted}\`\n\n` +
            `_Enter this in:_\n` +
            `WhatsApp → Linked Devices → Link with phone number`
        );

        // Try to DM the user directly
        try {
            const userJid = rawNumber + '@s.whatsapp.net';
            await conn.sendMessage(userJid, {
                text:
                    `👑 *QUEEN KYLIE V1 — Pairing Code*\n\n` +
                    `Your pairing code is:\n\n` +
                    `*${formatted}*\n\n` +
                    `📱 *How to use:*\n` +
                    `1. Open WhatsApp\n` +
                    `2. Go to Linked Devices\n` +
                    `3. Tap "Link a Device"\n` +
                    `4. Choose "Link with phone number"\n` +
                    `5. Enter the code above\n\n` +
                    `_Your session ID will be sent here automatically once linked._`
            });
        } catch {
            await reply(`⚠️ Could not DM +${rawNumber} directly — give them the code manually.`);
        }

    } catch (err) {
        const msg = err?.response?.data?.error || err.message || 'Unknown error';
        await reply(`❌ Failed to generate pairing code: ${msg}`);
    } finally {
        pendingSessions.delete(rawNumber);
    }
});
