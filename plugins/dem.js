const { cmd } = require("../command");

cmd({

    pattern: "delete1",

    alias: ["del"],

    desc: "Delete a replied message",

    category: "admin",

    filename: __filename

}, async (conn, mek, m, {

    from,

    isGroup,

    isAdmins,

    quoted,

    reply

}) => {

    try {

        if (!isGroup) {

            return reply("❌ This command can only be used in groups.");

        }

        if (!isAdmins) {

            return reply("❌ Only group admins can use this command.");

        }

        if (!quoted) {

            return reply("🗑️ Reply to the message you want to delete.");

        }

        await conn.sendMessage(from, {

            delete: {

                remoteJid: from,

                id: quoted.id,

                participant: quoted.sender

            }

        });

    } catch (error) {

        console.error("Delete command error:", error);

        reply("❌ Failed to delete message.");

    }

});