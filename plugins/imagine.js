const { cmd } = require("../command");

const axios = require("axios");

const BASE = "https://api.siputzx.my.id/api/ai/magicstudio";

cmd({

    pattern: "imagine",

    alias: ["magic", "magicai", "aiimage", "generate"],

    desc: "Generate AI art from text prompt",

    category: "ai",

    filename: __filename

}, async (conn, mek, m, {

    from,

    args,

    reply

}) => {

    try {

        const prompt = args.join(" ").trim();

        if (!prompt) {

            return reply(

                "*Usage:* .imagine <prompt>\n\nExample:\n.imagine a cyberpunk city"

            );

        }

        // React while generating (since AI takes time)

        await conn.sendMessage(from, {

            react: { text: "🎨", key: mek.key }

        });

        const url = `${BASE}?prompt=${encodeURIComponent(prompt)}`;

        const response = await axios.get(url, {

            responseType: "arraybuffer",

            timeout: 120000

        });

        const imageBuffer = Buffer.from(response.data);

        if (!imageBuffer || imageBuffer.length === 0) {

            return reply("❌ Empty response from API.");

        }

        if (imageBuffer.length > 5 * 1024 * 1024) {

            return reply("❌ Generated image is too large. Try a shorter prompt.");

        }

        await conn.sendMessage(from, {

            image: imageBuffer,

            caption: `🎨 *Prompt:* ${prompt}`

        }, { quoted: mek });

        await conn.sendMessage(from, {

            react: { text: "✅", key: mek.key }

        });

    } catch (error) {

        console.error("Imagine command error:", error);

        if (error.response?.status === 429) {

            reply("❌ Rate limit exceeded. Try again later.");

        } else if (error.response?.status === 400) {

            reply("❌ Invalid prompt.");

        } else if (error.response?.status === 500) {

            reply("❌ Server error. Try again later.");

        } else if (error.code === "ECONNABORTED") {

            reply("❌ Generation timed out. Try again.");

        } else {

            reply("❌ Failed to generate image.");

        }

    }

});