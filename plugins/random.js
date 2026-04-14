const { cmd } = require("../command");

const axios = require("axios");

const BASE = "https://api.princetechn.com/api/anime/random";

const API_KEY = "prince";

cmd({

    pattern: "random",

    alias: ["animerandom", "randomanime"],

    desc: "Get random anime data",

    category: "anime",

    filename: __filename

}, async (conn, mek, m, {

    from, reply

}) => {

    try {

        await conn.sendMessage(from, {

            react: { text: "🎲", key: mek.key }

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

        const animeData = response.data.result;

        // Build caption

        let caption = `*${animeData.title || "Unknown"}*\n\n`;

        if (animeData.episodes)

            caption += `📺 Episodes: ${animeData.episodes}\n`;

        if (animeData.status)

            caption += `📊 Status: ${animeData.status}\n`;

        if (animeData.synopsis)

            caption += `\n📝 ${animeData.synopsis}\n`;

        if (animeData.link)

            caption += `\n🔗 ${animeData.link}`;

        // Try downloading image

        let imageBuffer = null;

        if (animeData.thumbnail) {

            try {

                const imageResponse = await axios.get(animeData.thumbnail, {

                    responseType: "arraybuffer",

                    timeout: 30000

                });

                imageBuffer = Buffer.from(imageResponse.data);

                // Skip if too large (5MB limit)

                if (imageBuffer.length > 5 * 1024 * 1024) {

                    imageBuffer = null;

                }

            } catch (err) {

                console.log("Thumbnail download failed.");

                imageBuffer = null;

            }

        }

        if (imageBuffer) {

            await conn.sendMessage(from, {

                image: imageBuffer,

                caption

            }, { quoted: mek });

        } else {

            await conn.sendMessage(from, {

                text: caption

            }, { quoted: mek });

        }

        await conn.sendMessage(from, {

            react: { text: "✅", key: mek.key }

        });

    } catch (error) {

        console.error("Random anime error:", error);

        if (error.response?.status === 404) {

            reply("❌ Anime data not found.");

        } else if (error.response?.status === 429) {

            reply("❌ Rate limit exceeded. Try again later.");

        } else if (error.code === "ECONNABORTED") {

            reply("❌ Request timed out.");

        } else {

            reply("❌ Failed to fetch anime data.");

        }

    }

});