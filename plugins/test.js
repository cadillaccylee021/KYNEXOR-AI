const { cmd } = require('../command');

cmd({
    pattern: "test",
    desc: "Debug quoted message issue",
    category: "debug",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    console.log("Full message object:", JSON.stringify(m, null, 2));

    if (!m.quoted) return reply("*No quoted message detected!*");
    reply("*Quoted message detected!*");
});