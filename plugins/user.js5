const { cmd } = require("../command");
const config = require("../config");

const botOwner = config.OWNER_NUMBER || "2348084644182"; // Ensure owner number is correctly set

const isAuthorizedUser = (sender, bot) => {
  return sender.includes(botOwner) || sender.includes(bot.user.id.split(":")[0]);
};

// Block a user
cmd(
  {
    pattern: "block",
    desc: "Blocks a user 🚫",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, args }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    let target = args[0] || (mek.quoted ? mek.quoted.sender : null);
    if (!target) return;

    try {
      await conn.updateBlockStatus(target, "block");
    } catch (error) {
      console.error(`Failed to block user: ${error.message}`);
    }
  }
);

// Unblock a user
cmd(
  {
    pattern: "unblock",
    desc: "Unblocks a user ✅",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, args }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    let target = args[0] || (mek.quoted ? mek.quoted.sender : null);
    if (!target) return;

    try {
      await conn.updateBlockStatus(target, "unblock");
    } catch (error) {
      console.error(`Failed to unblock user: ${error.message}`);
    }
  }
);

// Pin a chat
cmd(
  {
    pattern: "pin",
    desc: "Pins a chat 📌",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, from }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    try {
      await conn.chatModify({ pin: true }, from);
    } catch (error) {
      console.error(`Failed to pin chat: ${error.message}`);
    }
  }
);

// Unpin a chat
cmd(
  {
    pattern: "unpin",
    desc: "Unpins a chat ❌",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, from }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    try {
      await conn.chatModify({ pin: false }, from);
    } catch (error) {
      console.error(`Failed to unpin chat: ${error.message}`);
    }
  }
);

// Archive a chat
cmd(
  {
    pattern: "archive",
    desc: "Archives a chat 📂",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, from }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    try {
      await conn.chatModify({ archive: true }, from);
    } catch (error) {
      console.error(`Failed to archive chat: ${error.message}`);
    }
  }
);

// Unarchive a chat
cmd(
  {
    pattern: "unarchive",
    desc: "Unarchives a chat 📂",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, from }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    try {
      await conn.chatModify({ archive: false }, from);
    } catch (error) {
      console.error(`Failed to unarchive chat: ${error.message}`);
    }
  }
);

// Clear chat
cmd(
  {
    pattern: "clear",
    desc: "Clears the chat history 🗑️",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, from }) => {
    if (!isAuthorizedUser(sender, conn)) return;

    try {
      await conn.chatModify({ clear: true }, from);
    } catch (error) {
      console.error(`Failed to clear chat: ${error.message}`);
    }
  }
);

cmd({
pattern: "del",
react: "🧹",
alias: ["delete"],
desc: "Delete Message",
category: "owner",
use: '.del',
filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants,  isItzcp, groupAdmins, isBotAdmins, isAdmins, reply}) => {
if (!isOwner) return;
try{
if (!m.quoted) return reply('No Message Quoted for Deletion');
const key = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id,
            participant: m.quoted.sender
        }
        await conn.sendMessage(m.chat, { delete: key })
await m.react("✅"); 
} catch(e) {
console.log(e);
reply('success..')
} 
})