// fun-compat-commands.js
const config = require("../config");
const { cmd } = require("../command");

// ----------------- GLOBAL HELPERS (define once) -----------------
const extractMentions = (m, mek) => {
  // preferred: message.mentionedJid (some baileys versions)
  try {
    if (Array.isArray(m?.mentionedJid) && m.mentionedJid.length) return m.mentionedJid;
  } catch (e) {}
  // fallback: extendedTextMessage.contextInfo.mentionedJid
  try {
    const ctx = mek?.message?.extendedTextMessage?.contextInfo;
    if (ctx && Array.isArray(ctx.mentionedJid) && ctx.mentionedJid.length) return ctx.mentionedJid;
  } catch (e) {}
  return [];
};

const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const makeBar = (p) => {
  const filled = Math.round((p / 100) * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${p}%`;
};

const short = (jid) => (typeof jid === "string" ? jid.split("@")[0] : jid);

// safe helper to get group members (array of jids)
const groupMembers = (groupMetadata, conn) => {
  if (!groupMetadata || !Array.isArray(groupMetadata.participants)) return [];
  let members = groupMetadata.participants.map((p) => p.id || p.jid || p);
  // remove bot itself if available
  const botJid = conn?.user?.jid || conn?.user?.id || null;
  if (botJid) members = members.filter((x) => x !== botJid);
  return members;
};

// ----------------- COUPLE COMMAND -----------------
cmd(
  {
    pattern: "couple",
    desc: "Pairs two group members and shows compatibility 💞",
    category: "group",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentionsInMessage = extractMentions(m, mek);
      let members = groupMembers(groupMetadata, conn);
      if (members.length < 2) return reply("❌ *Not enough members to pair!*");

      let p1, p2;
      if (mentionsInMessage.length >= 2) {
        p1 = mentionsInMessage[0];
        p2 = mentionsInMessage[1];
      } else if (mentionsInMessage.length === 1) {
        p1 = mentionsInMessage[0];
        const others = members.filter((x) => x !== p1);
        if (others.length === 0) return reply("❌ *No other members to pair with.*");
        p2 = others[Math.floor(Math.random() * others.length)];
      } else {
        const shuffled = members.sort(() => Math.random() - 0.5);
        p1 = shuffled[0];
        p2 = shuffled[1];
      }

      if (p1 === p2) {
        const others = members.filter((x) => x !== p1);
        if (others.length === 0) return reply("❌ *Not enough different members to pair.*");
        p2 = others[Math.floor(Math.random() * others.length)];
      }

      const sortedPairKey = [p1, p2].sort().join("|");
      const percent = hashString(sortedPairKey) % 101; // 0..100

      const compatibility = (n) => {
        if (n >= 90) return { label: "💖 Soulmates", text: "A legendary match — sparks everywhere! Expect fireworks, understanding and memes together.", emoji: "💘" };
        if (n >= 70) return { label: "💕 Excellent", text: "Great chemistry and lots of shared vibes. Could be a power couple.", emoji: "😍" };
        if (n >= 50) return { label: "💞 Good", text: "Nice potential — with effort this could blossom into something real.", emoji: "🙂" };
        if (n >= 30) return { label: "💔 Low", text: "It's a tough match — different wavelengths. Still, opposites can learn a lot from each other.", emoji: "😬" };
        return { label: "🧡 Very Low", text: "Hmm... not compatible by the stars today. Maybe great as friends!", emoji: "🤝" };
      };

      const band = compatibility(percent);

      const lines = [];
      lines.push("💘 *Perfect Match Alert!* 💘");
      lines.push("");
      lines.push(`❤️ *@${short(p1)}* ${band.emoji} *@${short(p2)}* ❤️`);
      lines.push("");
      lines.push(`*Compatibility:* ${band.label}`);
      lines.push(makeBar(percent));
      lines.push("");
      lines.push(band.text);
      lines.push("");
      lines.push("_Tip: Use_ `couple @member` _to pair a specific member with a random match, or_ `couple @a @b` _to check two specific members._");

      const mentions = [p1, p2];
      return await conn.sendMessage(from, { text: lines.join("\n"), mentions }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

// ----------------- GAY COMMAND -----------------
cmd(
  {
    pattern: "gay",
    desc: "Calculate how gay a member is (fun).",
    category: "fun",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentions = extractMentions(m, mek);
      const members = groupMembers(groupMetadata, conn);
      if (members.length === 0) return reply("❌ *No members found.*");

      const target = mentions.length >= 1 ? mentions[0] : members[Math.floor(Math.random() * members.length)];
      const percent = hashString(target + "-gay") % 101;

      const msg = (n) => {
        if (n >= 90) return "🌈 *Iconic!* Absolute vibes. Proud energy overload.";
        if (n >= 70) return "🏳️‍🌈 *Very gay!* Strong rainbow energy.";
        if (n >= 50) return "✨ *Pretty gay.* Comfortable and confident.";
        if (n >= 30) return "🙂 *A little gay.* Could surprise you.";
        return "🤭 *Not very gay.* Or secretly very gay — plot twist!";
      };

      const lines = [];
      lines.push(`🏳️‍🌈 *@${short(target)}*'s gay level`);
      lines.push(makeBar(percent));
      lines.push("");
      lines.push(msg(percent));

      return await conn.sendMessage(from, { text: lines.join("\n"), mentions: [target] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

// ----------------- LESBIAN COMMAND -----------------
cmd(
  {
    pattern: "lesbian",
    desc: "Calculate how lesbian a member is (fun).",
    category: "fun",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentions = extractMentions(m, mek);
      const members = groupMembers(groupMetadata, conn);
      if (members.length === 0) return reply("❌ *No members found.*");

      const target = mentions.length >= 1 ? mentions[0] : members[Math.floor(Math.random() * members.length)];
      const percent = hashString(target + "-lesbian") % 101;

      const msg = (n) => {
        if (n >= 90) return "🌸 *Legendary lesbian energy!* Unapologetic and iconic.";
        if (n >= 70) return "💗 *Very lesbian!* Strong gay-sister vibes.";
        if (n >= 50) return "🎀 *Pretty lesbian.* Comfortable in who they are.";
        if (n >= 30) return "🙂 *A little lesbian.* Might be exploring.";
        return "🤭 *Not very lesbian.* Or secretly crushing — who knows!";
      };

      const lines = [];
      lines.push(`💗 *@${short(target)}*'s lesbian level`);
      lines.push(makeBar(percent));
      lines.push("");
      lines.push(msg(percent));

      return await conn.sendMessage(from, { text: lines.join("\n"), mentions: [target] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

// ----------------- CRUSH COMMAND -----------------
// ----------------- CRUSH COMMAND (improved) -----------------
// ----------------- CRUSH COMMAND (fixed null-safe) -----------------
cmd(
  {
    pattern: "crush",
    desc: "Reveal someone's crush (for fun). Supports: crush, crush @target, crush @target @crush",
    category: "fun",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentions = extractMentions(m, mek);
      let members = groupMembers(groupMetadata, conn);
      members = members.filter(Boolean); // remove any null/undefined

      if (members.length < 2) return reply("❌ *Not enough members to determine a crush.*");

      let target, crush;

      if (mentions.length >= 2) {
        target = mentions[0] || members[Math.floor(Math.random() * members.length)];
        crush = mentions[1] || members.find((m) => m !== target);
        if (target === crush) {
          const others = members.filter((x) => x !== target);
          crush = others[Math.floor(Math.random() * others.length)];
        }
      } else if (mentions.length === 1) {
        target = mentions[0] || members[Math.floor(Math.random() * members.length)];
        const candidates = members.filter((x) => x !== target);
        crush = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        target = members[Math.floor(Math.random() * members.length)];
        const candidates = members.filter((x) => x !== target);
        crush = candidates[Math.floor(Math.random() * candidates.length)];
      }

      // final safety check
      if (!target) target = members[0];
      if (!crush) crush = members.find((m) => m !== target) || members[0];

      const percent = Math.floor(Math.random() * 101);

      const lines = [];
      lines.push(`💘 *@${short(target)}*'s crush is *@${short(crush)}*!`);
      lines.push(makeBar(percent));
      lines.push("");
      lines.push("_Slide in their dm's and shoot your shot and take your L_");

      return await conn.sendMessage(
        from,
        { text: lines.join("\n"), mentions: [target, crush].filter(Boolean) },
        { quoted: mek }
      );
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

// ----------------- ROAST COMMAND (improved, mentionable) -----------------
cmd(
  {
    pattern: "roast",
    desc: "Roasts a random group member or a mentioned member 🔥 (use roast @member)",
    category: "group",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentions = extractMentions(m, mek);
      const members = groupMembers(groupMetadata, conn);
      if (members.length < 1) return reply("❌ *Not enough members!*");

      // If mention provided, roast that person; otherwise choose random
      const victim = mentions.length >= 1 ? mentions[0] : members[Math.floor(Math.random() * members.length)];

      const roasts = [
        "You're not stupid — you just have bad luck thinking.",
        "If I wanted to kill myself I'd climb your ego and jump to your IQ.",
        "I'd explain it to you but I left my crayons at home.",
        "You’re the reason the gene pool needs a lifeguard.",
        "You're like a cloud. When you disappear, it's a beautiful day.",
        "If ignorance is bliss, you must be the happiest person alive.",
        "You bring everyone so much joy… when you leave the room.",
        "Some drink from the fountain of knowledge; you only gargled.",
        "You have the face for radio and the voice for silent movies.",
        "I’d call you a tool, but even they serve a purpose.",
        "You're proof that evolution can go in reverse.",
        "You're like a software update. Whenever I see you I think: later.",
        "You're not the sharpest knife in the drawer… but you might be the spoon.",
        "Congratulations — you’re the reason we have warning labels.",
        "You'd struggle to pour water out of a boot with instructions written on the heel.",
        "Your secrets are safe with me — I wasn't even listening.",
        "I'd tell you to go to hell, but I work there and don't want the competition.",
        "You have the personality of a dial tone.",
        "You're the human equivalent of a participation trophy.",
        "If laughter is the best medicine, your presence is definitely a placebo."
      ];

      const roastMessage = roasts[Math.floor(Math.random() * roasts.length)];

      const text = `🔥 *Roast Time!* 🔥\n\n🤡 *@${short(victim)}*, ${roastMessage}`;

      return await conn.sendMessage(from, { text, mentions: [victim] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

// ----------------- RATE COMMAND -----------------
cmd(
  {
    pattern: "rate",
    desc: "Rate a member from 1 to 100 (fun).",
    category: "fun",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      const mentions = extractMentions(m, mek);
      const members = groupMembers(groupMetadata, conn);
      if (members.length === 0) return reply("❌ *No members found.*");

      const target = mentions.length >= 1 ? mentions[0] : members[Math.floor(Math.random() * members.length)];
      const percent = (hashString(target + "-rate") % 100) + 1; // 1..100

      const bandMsg = (n) => {
        if (n >= 90) return "🏆 *Legend!* Everybody loves them.";
        if (n >= 75) return "🌟 *Amazing!* Top-tier human.";
        if (n >= 50) return "👍 *Good!* Solid presence.";
        if (n >= 30) return "😅 *Okay.* Needs work.";
        return "🤨 *Oof.* We all have off days — be kind!";
      };

      const lines = [];
      lines.push(`📊 Rating for *@${short(target)}*`);
      lines.push(makeBar(percent));
      lines.push("");
      lines.push(bandMsg(percent));

      return await conn.sendMessage(from, { text: lines.join("\n"), mentions: [target] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);

cmd(
  {
    pattern: "king",
    desc: "Randomly selects a group king 👑",
    category: "group",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      let members = groupMetadata.participants.map((p) => p.id);
      if (members.length < 1) return reply("❌ *Not enough members!*");

      let king = members[Math.floor(Math.random() * members.length)];

      let text = `👑 *Bow down to the new King!* 👑\n\n🥶 *@${king.split("@")[0]}* now rules this group! 🤴🔥`;

      return await conn.sendMessage(from, { text, mentions: [king] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e}`);
    }
  }
);


cmd(
  {
    pattern: "tod",
    desc: "Gives a random Truth or Dare challenge 🎭",
    category: "group",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      let truths = [
        "What’s your biggest secret? 🤫",
        "Have you ever had a crush on someone in this group? 😏",
        "What's the most embarrassing thing you've done? 😆",
      ];

      let dares = [
        "Send a love confession to the first person in your chat. 💌",
        "Talk like a baby for the next 5 messages. 👶",
        "Send a selfie making the weirdest face. 🤪",
      ];

      let choice = Math.random() > 0.5 ? "Truth" : "Dare";
      let challenge = choice === "Truth" ? truths[Math.floor(Math.random() * truths.length)] : dares[Math.floor(Math.random() * dares.length)];

      let text = `🎭 *Truth or Dare!* 🎭\n\n🤔 *You got:* *${choice}*\n👉 ${challenge}`;

      return await conn.sendMessage(from, { text }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e}`);
    }
  }
);

cmd(
  {
    pattern: "kickrandom",
    desc: "Randomly kicks a member 😈",
    category: "group",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, isGroup, groupMetadata }) => {
    try {
      if (!isGroup) return reply("🚫 *This command can only be used in groups!*");

      let admins = groupMetadata.participants.filter((p) => p.admin).map((p) => p.id);
      let isAdmin = admins.includes(m.sender);
      if (!isAdmin) return reply("⚠️ *Only admins can use this command!*");

      let members = groupMetadata.participants.filter((p) => !p.admin).map((p) => p.id);
      if (members.length < 1) return reply("❌ *No kickable members found!*");

      let unlucky = members[Math.floor(Math.random() * members.length)];

      await conn.groupParticipantsUpdate(from, [unlucky], "remove");

      let text = `😈 *Random Kick Activated!* 🚀\n\n💀 *@${unlucky.split("@")[0]}* has been banished from the group! ☠️`;

      return await conn.sendMessage(from, { text, mentions: [unlucky] }, { quoted: mek });
    } catch (e) {
      console.log(e);
      return reply(`❌ *Error:* ${e}`);
    }
  }
);