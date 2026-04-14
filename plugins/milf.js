const { cmd } = require("../command");

const axios = require("axios");

const BASE = "https://api.princetechn.com/api/anime/milf";

const API_KEY = "prince";

cmd({

    pattern: "milf",

    alias: ["milfnsfw"],

    desc: "Get random milf NSFW anime images",

    category: "anime",

    filename: __filename

}, async (conn, mek, m, {

    from,

    isGroup,

    reply

}) => {

    try {

        // Optional safety: block in groups

        if (isGroup) {

            return reply("❌ This command can only be used in private chat.");

        }

        await conn.sendMessage(from, {

            react: { text: "🔞", key: mek.key }

        });

        const url = `${BASE}?apikey=${API_KEY}`;

        const response = await axios.get(url, {

            headers: {

                "User-Agent": "Mozilla/5.0",

                "Accept": "application/json"

            },

            timeout: 30000

        });

        if (!response.data?.result) {

            return reply("❌ Invalid API response.");

        }

        const imageUrl = response.data.result;

        if (typeof imageUrl !== "string") {

            return reply("❌ Invalid image URL received.");

        }

        const imageResponse = await axios.get(imageUrl, {

            responseType: "arraybuffer",

            timeout: 30000

        });

        const imageBuffer = Buffer.from(imageResponse.data);

        if (!imageBuffer || imageBuffer.length === 0) {

            return reply("❌ Empty image response.");

        }

        // 5MB protection

        if (imageBuffer.length > 5 * 1024 * 1024) {

            return reply("❌ Image too large. Try again.");

        }

        await conn.sendMessage(from, {

            image: imageBuffer

        }, { quoted: mek });

        await conn.sendMessage(from, {

            react: { text: "✅", key: mek.key }

        });

    } catch (error) {

        console.error("Milf command error:", error);

        if (error.response?.status === 404) {

            reply("❌ Image not found.");

        } else if (error.response?.status === 429) {

            reply("❌ Rate limit exceeded. Try again later.");

        } else if (error.code === "ECONNABORTED") {

            reply("❌ Request timed out.");

        } else {

            reply("❌ Failed to fetch image.");

        }

    }

});