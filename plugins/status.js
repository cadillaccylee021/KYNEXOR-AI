const { cmd } = require("../command");

cmd({

  pattern: "save",

  desc: "Save replied status to your DM",

  category: "owner",

  filename: __filename

}, saveStatusHandler);

// emoji triggers

cmd({ pattern: "🙏", dontAddCommandList: true, filename: __filename }, saveStatusHandler);

cmd({ pattern: "📥", dontAddCommandList: true, filename: __filename }, saveStatusHandler);

async function saveStatusHandler(conn, mek, m, { sender }) {

  try {

    if (!m.quoted) return;

    // check if quoted message is from status

    const context = m.message?.extendedTextMessage?.contextInfo;

    if (!context?.remoteJid?.includes("status@broadcast")) {

      return; // not a status reply

    }

    const quotedMsg = context.quotedMessage;

    if (!quotedMsg) return;

    const mediaMessage =

      quotedMsg.imageMessage ||

      quotedMsg.videoMessage ||

      quotedMsg.audioMessage;

    if (!mediaMessage) return;

    // download media

    const buffer = await m.quoted.download();

    const caption = mediaMessage.caption || "";

    const targetJid = sender;

    if (mediaMessage.mimetype?.startsWith("image")) {

      await conn.sendMessage(targetJid, {

        image: buffer,

        caption: caption

      });

    } else if (mediaMessage.mimetype?.startsWith("video")) {

      await conn.sendMessage(targetJid, {

        video: buffer,

        caption: caption

      });

    } else if (mediaMessage.mimetype?.startsWith("audio")) {

      await conn.sendMessage(targetJid, {

        audio: buffer,

        mimetype: mediaMessage.mimetype,

        ptt: mediaMessage.ptt || false

      });

    }

  } catch (err) {

    console.error("Save Status Error:", err);

  }

}