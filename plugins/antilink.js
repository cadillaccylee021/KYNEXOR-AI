const { cmd } = require("../command");
const { enableLinkDetection, disableLinkDetection, getLinkDetectionMode } = require("../lib/linkDetection");

cmd({
    pattern: "antilink",
    desc: "Manage anti-link settings in a group.",
    category: "moderation",
    filename: __filename
}, async (conn, mek, m, { from, args, isGroup, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply("*This command can only be used in groups!*");

        // quick normalize helper: returns digits-only left part
        const normalize = jid => {
            if (!jid) return '';
            return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
        };

        // Determine the sender JID from mek (group messages usually have key.participant)
        const rawSender = mek?.key?.participant || mek?.participant || mek?.key?.fromMe
            ? (conn.user?.id?.split(':')[0] + '@s.whatsapp.net')
            : mek?.key?.remoteJid || '';
        const senderDigits = normalize(rawSender);

        // If the provided isAdmins is false, try a fallback admin detection using group metadata.
        let effectiveIsAdmin = Boolean(isAdmins);
        if (!effectiveIsAdmin) {
            try {
                const meta = await conn.groupMetadata(from);
                if (meta && Array.isArray(meta.participants)) {
                    const adminDigits = meta.participants
                        .filter(p => p && (p.admin === 'admin' || p.admin === 'superadmin'))
                        .map(p => normalize(p.id || p.jid || p));

                    if (adminDigits.includes(senderDigits)) {
                        effectiveIsAdmin = true;
                    }
                }
            } catch (err) {
                // If metadata fetch fails, just continue — we'll enforce admin requirement below.
                console.warn("antilink fallback admin check failed:", err?.message || err);
            }
        }

        if (!effectiveIsAdmin) return reply("*You must be an admin to use this command!*");

        // Get the first argument after the command
        const mode = args.length > 0 ? args[0].toLowerCase() : null;

        // If user asked only `antilink` — show current mode
        if (!mode) {
            try {
                const cur = await getLinkDetectionMode(from);
                return reply(`*Antilink current mode:* ${cur ? `\`${cur}\`` : "_disabled_" }.\n\nUsage: antilink [kick/delete/warn/off]`);
            } catch (e) {
                return reply("*Usage: antilink [kick/delete/warn/off]*");
            }
        }

        if (!["kick", "delete", "warn", "off"].includes(mode)) {
            return reply("*Invalid option. Usage: antilink [kick/delete/warn/off]*");
        }

        if (mode === "off") {
            disableLinkDetection(from);
            return reply("*Antilink has been disabled for this group.*");
        }

        // enable with specified mode (kick/delete/warn)
        enableLinkDetection(from, mode);
        return reply(`*Antilink is now set to '${mode}' mode in this group.*`);
    } catch (err) {
        console.error("antilink command error:", err);
        return reply("*An error occurred while processing the command.*");
    }
});