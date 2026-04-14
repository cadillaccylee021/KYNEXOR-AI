const { cmd } = require('../command');
const yts = require("yt-search");
const axios = require("axios");

cmd({
    pattern: "play",
    desc: "Downloads audio from YouTube (Stream Direct)",
    category: "downloader",
    filename: __filename,
    use: "<search text>"
},
// PERFECT MATCH WITH AI FILE:
async (conn, mek, m, { from, q, reply, react }) => { 
    try {
        if (!q) return reply("*_Give me a search query_*");

        // await react("📥");

        // Search for the video
        let searchResults = await yts(q);
        let video = searchResults.all[0];

        if (!video) {
           // await react("❌");
            return reply("*_No results found for your search_*");
        }

        // Send video details
        await conn.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `\n*🎵 QUEEN_KYLIE-V1 Music Downloader 🎵*\n\n*🎧 Title:* ${video.title}\n*🔗 URL:* ${video.url}\n*⏳ Duration:* ${video.timestamp}\n*🎙️ Author:* ${video.author.name}\n\n_🎶 Fetching high-quality audio..._`
        }, { quoted: mek });

        const videoUrl = encodeURIComponent(video.url);
        let downloadUrl = null;

        try {
            // PRIMARY API
            const primaryApi = `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${videoUrl}&quality=128kbps`;
            const { data: primaryData } = await axios.get(primaryApi);

            if (primaryData.success && primaryData.result.download_url) {
                downloadUrl = primaryData.result.download_url;
            } else {
                throw new Error("Primary API failed");
            }
        } catch (e) {
            console.log("Primary API failed, trying fallback...");
            // FALLBACK API
            const fallbackApi = `https://api.giftedtech.co.ke/api/download/savetubemp3?apikey=gifted&url=${videoUrl}`;
            const { data: fallbackData } = await axios.get(fallbackApi);

            if (fallbackData.success && fallbackData.result.download_url) {
                downloadUrl = fallbackData.result.download_url;
            }
        }

        if (!downloadUrl) {
            //await react("❌");
            return reply("*_Failed to generate a download link. Please try again later._*");
        }

        // Send the audio file DIRECTLY from the URL
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            fileName: `${video.title}.mp3`,
            mimetype: "audio/mpeg"
        }, { quoted: mek });

       // await react("✅");

    } catch (error) {
        console.error("Caught Error:", error);
        //await react("❌");
        return reply("*_Error: Could not process your request!!_*");
    }
});
