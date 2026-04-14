const { cmd } = require('../command');

cmd({
    pattern: "fwd",
    desc: "Forward replied message to your DM",
    category: "whatsapp",
    filename: __filename
}, async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        if (!quoted) return reply('*Please reply to a message to forward it.*');

        // Extract quoted message content safely
        let forwardMessage = quoted.message || quoted;
        if (!forwardMessage || Object.keys(forwardMessage).length === 0) {
            return reply('*Error: No valid content in the quoted message.*');
        }

        // Ensure valid user JID
        const target = sender.includes('@') ? sender : sender + '@s.whatsapp.net';

        // Log the message content for debugging
        console.log('Forwarding message:', JSON.stringify(forwardMessage, null, 2));

        // Forward the message properly based on type
        if (quoted.mtype === 'conversation' || quoted.mtype === 'extendedTextMessage') {
            await conn.sendMessage(target, { text: quoted.text }, { quoted: mek });
        } else if (quoted.mtype === 'imageMessage') {
            await conn.sendMessage(target, { image: quoted.imageMessage, caption: quoted.text || '' }, { quoted: mek });
        } else if (quoted.mtype === 'videoMessage') {
            await conn.sendMessage(target, { video: quoted.videoMessage, caption: quoted.text || '' }, { quoted: mek });
        } else if (quoted.mtype === 'audioMessage') {
            await conn.sendMessage(target, { audio: quoted.audioMessage, mimetype: 'audio/mp4' }, { quoted: mek });
        } else {
            return reply('*Error: This message type cannot be forwarded.*');
        }

        reply('*Message forwarded to your DM.*');
    } catch (e) {
        console.log('Forwarding error:', e);
        reply('*An error occurred while forwarding the message.*');
    }
});

// Regex to detect 'keep' for forwarding functionality
const regexKeepMessage = /\bkeep\b/i;

cmd({
    pattern: "keep-detect",
    desc: "Detects 'keep' and forwards the replied message",
    category: "whatsapp",
    filename: __filename,
    on: "text"
}, async (conn, mek, m, { from, quoted, sender, body, isGroup, reply }) => {
    try {
        if (!quoted || isGroup) return; // Prevents forwarding in groups

        // Check if the message contains 'keep' and forward it
        if (regexKeepMessage.test(body)) {
            let forwardMessage = quoted.message || quoted;
            if (!forwardMessage || Object.keys(forwardMessage).length === 0) {
                return reply('*Error: No valid content in the quoted message.*');
            }

            const target = sender.includes('@') ? sender : sender + '@s.whatsapp.net';

            console.log('Forwarding "keep" message:', JSON.stringify(forwardMessage, null, 2));

            if (quoted.mtype === 'conversation' || quoted.mtype === 'extendedTextMessage') {
                await conn.sendMessage(target, { text: quoted.text }, { quoted: mek });
            } else if (quoted.mtype === 'imageMessage') {
                await conn.sendMessage(target, { image: quoted.imageMessage, caption: quoted.text || '' }, { quoted: mek });
            } else if (quoted.mtype === 'videoMessage') {
                await conn.sendMessage(target, { video: quoted.videoMessage, caption: quoted.text || '' }, { quoted: mek });
            } else if (quoted.mtype === 'audioMessage') {
                await conn.sendMessage(target, { audio: quoted.audioMessage, mimetype: 'audio/mp4' }, { quoted: mek });
            } else {
                return reply('*Error: This message type cannot be forwarded.*');
            }

            reply('*Message saved to your DM.*');
        }
    } catch (e) {
        console.log('Keep forwarding error:', e);
    }
});