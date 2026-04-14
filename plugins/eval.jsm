const { cmd } = require("../command");
const util = require("util");

cmd({
    pattern: "$",
    desc: "Executes JavaScript code directly",
    category: "main",
    filename: __filename
},  
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {  

    if (!isOwner) return reply("❌ *Only the bot owner can use this command!*");  

    if (!q.startsWith("$")) return; // Ignore if it doesn't start with "$"  

    let code = q.slice(1).trim(); // Remove "$" from input  

    try {  
        let evaled = await eval(code);  
        if (typeof evaled !== "string") evaled = util.inspect(evaled);  
        await reply(evaled);  
    } catch (err) {  
        await reply(util.format(err));  
    }  
});