const { cmd } = require("../command");
const config = require("../config");

const botOwner = config.OWNER_NUMBER || "2348084644182"; // Ensure owner number is set

const isAuthorizedUser = (sender, bot) => {
  return sender.includes(botOwner) || sender.includes(bot.user.id.split(":")[0]);
};

// Broadcast to all group chats
cmd(
  {
    pattern: "broadcastgroup",
    desc: "Broadcasts a message to all group chats 📢",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, reply, args }) => {
    if (!isAuthorizedUser(sender, conn)) return reply("❌ *Unauthorized!*");

    let message = args.join(" ");
    if (!message) return reply("⚠️ *Provide a message to broadcast!*");

    // Use Array.from() to convert the Map keys into an array
    let allChats = Array.from(conn.chats.keys());
    // Filter only group chats (chat IDs ending with "@g.us")
    let groupChats = allChats.filter((chat) => chat.endsWith("@g.us"));
    let sentCount = 0;

    for (let chat of groupChats) {
      try {
        await conn.sendMessage(chat, { text: `📢 *Broadcast Message:*\n\n${message}` });
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to ${chat}:`, error);
      }
    }

    reply(`✅ *Broadcast sent to ${sentCount} group chats!*`);
  }
);

// Broadcast to all private chats
cmd(
  {
    pattern: "broadcastprivate",
    desc: "Broadcasts a message to all private chats 📢",
    category: "user",
    filename: __filename,
  },
  async (conn, mek, m, { sender, reply, args }) => {
    if (!isAuthorizedUser(sender, conn)) return reply("❌ *Unauthorized!*");

    let message = args.join(" ");
    if (!message) return reply("⚠️ *Provide a message to broadcast!*");

    // Use Array.from() to convert the Map keys into an array
    let allChats = Array.from(conn.chats.keys());
    // Filter out group chats so only private chats remain
    let privateChats = allChats.filter((chat) => !chat.endsWith("@g.us"));
    let sentCount = 0;

    for (let chat of privateChats) {
      try {
        await conn.sendMessage(chat, { text: `📢 *Broadcast Message:*\n\n${message}` });
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to ${chat}:`, error);
      }
    }

    reply(`✅ *Broadcast sent to ${sentCount} private chats!*`);
  }
);