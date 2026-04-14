const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "joingc",
    desc: "Join a group by link",
    category: "whatsapp",
    filename: __filename
}, async (conn, mek, m, { from, args, q, quoted, reply }) => {
    try {
        let groupLink = q ? q : quoted ? quoted.body : null;
        if (!groupLink) return reply("*Uhh, please provide a group link!*");

        const inviteMatch = groupLink.match(/https:\/\/chat\.whatsapp\.com\/([\w\d]+)/);
        if (!inviteMatch) return reply("*Invalid group link! Please provide a valid invite link.*");

        const groupId = inviteMatch[1];

        try {
            let response = await conn.groupAcceptInvite(groupId);
            if (response && response.includes("joined to:")) {
                return reply("*_Joined successfully!_*");
            }
        } catch (error) {
            if (error.message.includes("request sent to admin")) {
                return reply("*Request sent to join the group. Please wait for admin approval.*");
            } else if (error.message.includes("not an admin") || error.message.includes("removed")) {
                return reply("*Can't join, you were previously removed from the group.*");
            } else {
                return reply("*Can't join, an error occurred.*");
            }
        }
    } catch (e) {
        console.error(e);
        return reply("*Can't join, group ID not found or an error occurred!*");
    }
});

cmd({
    pattern: "left",
    desc: "Leave a group (requires confirmation)",
    category: "whatsapp",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, q, reply }) => {
    try {
        if (!isGroup) return reply("*This command only works in groups!*");

        if (q.toLowerCase() === "yes") {
            await conn.groupLeave(from);
            return reply("*Left...*");
        } else {
            return reply("*Are you sure you want to leave? Type 'left yes' to confirm.*");
        }
    } catch (e) {
        console.error(e);
        return reply("*Can't leave the group. Maybe I'm not an admin!*");
    }
});