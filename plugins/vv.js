const config = require("../config");

const { cmd, commands } = require("../command");

// /vv + emoji triggers (sends VV media to command user's DM silently)

cmd({
  pattern: "vv",
  desc: "Get view once (send to DM).",
  category: "owner",
  filename: __filename
}, vvHandler);

cmd({
  pattern: "❤️",
  dontAddCommandList: true,
  filename: __filename
}, vvHandler);

cmd({

  pattern: "🌝",
  dontAddCommandList: true,
  filename: __filename
}, vvHandler);

cmd({
  pattern: "😂",
  dontAddCommandList: true,
  filename: __filename
}, vvHandler);

async function vvHandler(conn, mek, m, { sender, senderNumber }) {
  try {

    if (!m.quoted) return;

    const qmessage =
      m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!qmessage) return;

    const mediaMessage =
      qmessage.imageMessage ||
      qmessage.videoMessage ||
      qmessage.audioMessage;

    if (!mediaMessage?.viewOnce) return;

    const buff = await m.quoted.download();
    const cap = mediaMessage.caption || "";

    const targetJid =
      sender || `${senderNumber}@s.whatsapp.net`;

    if (mediaMessage.mimetype?.startsWith("image")) {

      await conn.sendMessage(targetJid, {
        image: buff,
        caption: cap
      });

    } else if (mediaMessage.mimetype?.startsWith("video")) {

      await conn.sendMessage(targetJid, {
        video: buff,
        caption: cap
      });

    } else if (mediaMessage.mimetype?.startsWith("audio")) {

      await conn.sendMessage(targetJid, {
        audio: buff,
        mimetype: mediaMessage.mimetype,
        ptt: mediaMessage.ptt || false
      });

    }

  } catch (e) {
    console.error(e);
  }
}