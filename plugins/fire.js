const { cmd } = require('../command');

cmd({

    pattern: "🔥",

    desc: "Fire reaction",

    category: "fun",

    react: "🔥"

}, async (conn, mek, m, { reply }) => {

    reply("Too hot to handle 😎🔥");

});