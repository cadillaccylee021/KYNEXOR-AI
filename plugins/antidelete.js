// plugins/antidelete.js

const { cmd } = require('../command');
const { getAnti, setAnti, initializeAntiDeleteSettings } = require('../data/antidel');

initializeAntiDeleteSettings();

/* ================= ANTIDELETE (DM + GROUP) ================= */

cmd({
    pattern: "antidelete",
    alias: ["antidel","ad"],
    desc: "Toggle AntiDelete for group and private chats",
    category: "misc",
    filename: __filename
},
async (conn, mek, m, { reply, args }) => {
    try {

        const action = (args[0] || "").toLowerCase();
        const type = (args[1] || "").toLowerCase();

        if (action === "on") {
            if (type === "gc") {
                await setAnti("gc", true);
                return reply("✔ AntiDelete enabled for *Groups*.");
            }

            if (type === "dm") {
                await setAnti("dm", true);
                return reply("✔ AntiDelete enabled for *Direct Messages*.");
            }

            await setAnti("gc", true);
            await setAnti("dm", true);

            return reply("✔ AntiDelete enabled for *Groups & DMs*.");
        }

        if (action === "off") {

            if (type === "gc") {
                await setAnti("gc", false);
                return reply("✖ AntiDelete disabled for *Groups*.");
            }

            if (type === "dm") {
                await setAnti("dm", false);
                return reply("✖ AntiDelete disabled for *Direct Messages*.");
            }

            await setAnti("gc", false);
            await setAnti("dm", false);

            return reply("✖ AntiDelete disabled everywhere.");
        }

        if (action === "status") {

            const gc = await getAnti("gc");
            const dm = await getAnti("dm");
            const st = await getAnti("status");

            return reply(
`*AntiDelete Status*

👥 Groups : ${gc ? "ON" : "OFF"}
💬 DM     : ${dm ? "ON" : "OFF"}
📸 Status : ${st ? "ON" : "OFF"}`
            );
        }

        return reply(
`*AntiDelete Command*

.antidelete on
Enable everywhere

.antidelete off
Disable everywhere

.antidelete on gc
Enable only groups

.antidelete off gc
Disable only groups

.antidelete on dm
Enable only DM

.antidelete off dm
Disable only DM

.antidelete status`
        );

    } catch (err) {
        console.error("Antidelete error:", err);
        reply("Error updating AntiDelete settings.");
    }
});


/* ================= ANTIDELETE STATUS ================= */

cmd({
    pattern: "antideletestatus",
    alias: ["adstatus","antistatus"],
    desc: "Toggle AntiDelete for WhatsApp Status",
    category: "misc",
    filename: __filename
},
async (conn, mek, m, { reply, args }) => {

    try {

        const action = (args[0] || "").toLowerCase();

        if (action === "on") {
            await setAnti("status", true);
            return reply("✔ AntiDelete enabled for *Status*.");
        }

        if (action === "off") {
            await setAnti("status", false);
            return reply("✖ AntiDelete disabled for *Status*.");
        }

        if (action === "status") {

            const st = await getAnti("status");

            return reply(
`*Status AntiDelete*

📸 Status : ${st ? "ON" : "OFF"}`
            );
        }

        return reply(
`*Status AntiDelete*

.antideletestatus on
Enable status protection

.antideletestatus off
Disable status protection

.antideletestatus status`
        );

    } catch (err) {
        console.error("Status antidelete error:", err);
        reply("Error updating Status AntiDelete.");
    }

});