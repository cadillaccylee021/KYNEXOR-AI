const { cmd } = require('../command');
const axios = require('axios');

// 1. DavidXTech AI (POST Request)
cmd({
    pattern: "chat",
    alias: ["dx", "davidx"],
    desc: "Chat with DavidXTech AI",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message.\nExample: `.chat How are you?`");

        const response = await axios.post('https://api.davidxtech.de/ai/ai-chat', 
            { message: q }, 
            {
                headers: {
                    'accept': '*/*',
                    'X-API-Key': 'FREE-TEST-KEY-3000',
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;
        if (!data || !data.response) {
            await react("❌");
            return reply("DavidXTech AI failed to respond.");
        }

        await reply(`🤖 *DavidXTech AI:*\n\n${data.response}`);
        await react("✅");
    } catch (e) {
        console.error("Error in DavidXTech AI:", e);
        await react("❌");
        reply("An error occurred with the DavidXTech API.");
    }
});

// 2. GiftedTech AI (GET Request)
cmd({
    pattern: "queen kylie",
    alias: ["gt", "giftedai"],
    desc: "Chat with GiftedTech AI",
    category: "ai",
    react: "🎁",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message.\nExample: `.queen kylie What do you know?`");

        const apiUrl = `https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.result) {
            await react("❌");
            return reply("Queen Kylie AI failed to respond.");
        }

        await reply(`🎁 *GiftedTech AI:*\n\n${data.result}`);
        await react("✅");
    } catch (e) {
        console.error("Error in GiftedTech AI:", e);
        await react("❌");
        reply("An error occurred with the GiftedTech API.");
    }
});

// 3. Arcane GPT (GET Request with Session Memory)
cmd({
    pattern: "eleven",
    alias: ["nx", "cipher"],
    desc: "Chat with Arcane GPT",
    category: "ai",
    react: "🔮",
    filename: __filename
},
// Added 'sender' to the destructured variables below
async (conn, mek, m, { from, q, reply, react, sender }) => {
    try {
        if (!q) return reply("Please provide a message.\nExample: `.eleven Explain quantum physics`");

        // Added session_id parameter and encoded the sender's ID to keep the URL safe
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/ai/gpt?q=${encodeURIComponent(q)}&session_id=${encodeURIComponent(sender)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.result) {
            await react("❌");
            return reply("Eleve's AI failed to respond.");
        }

        await reply(`🔮 *Arcane Response:*\n\n${data.result}`);
        await react("✅");
    } catch (e) {
        console.error("Error in Arcane AI:", e);
        await react("❌");
        reply("An error occurred with the Arcane API.");
    }
});
