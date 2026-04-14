const os = require("os")
const { cmd, commands } = require('../command')

function runtime(seconds) {
    seconds = Math.floor(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

cmd({
    pattern: "uptime",
    alias: ["runtime"],
    desc: "Shows how long the bot has been running.",
    category: "misc",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const up = runtime(process.uptime());
        reply(`*Pʟᴀᴛɪɴᴜᴍ-V2 ⚡ Uptime:* ${up}`);
    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});