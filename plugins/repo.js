'use strict';
const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

cmd({
  pattern: 'botrepo',
  alias: ['repo'],
  react: '📁',
  desc: 'Bot repository info',
  category: 'general',
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    let repoData;
    try {
      const res = await axios.get('https://api.github.com/repos/sircylee/Queen_Kylie-V1');
      repoData = res.data;
    } catch {
      // fallback static info
      repoData = null;
    }
    const msg = repoData
      ? `📦 *${repoData.name || 'QUEEN_KYLIE-V1'}*\n\n📝 *Description:* ${repoData.description || 'A powerful WhatsApp bot'}\n⭐ *Stars:* ${repoData.stargazers_count || 0}\n🍴 *Forks:* ${repoData.forks_count || 0}\n👀 *Watchers:* ${repoData.watchers_count || 0}\n🗃️ *Open Issues:* ${repoData.open_issues_count || 0}\n💳 *License:* ${repoData.license?.name || 'N/A'}\n\n🔗 *Repo:* https://github.com/sircylee/Queen_Kylie-V1`
      : `📦 *QUEEN_KYLIE-V1*\n\n📝 A powerful multi-feature WhatsApp bot.\n\n🔗 *Repo:* https://github.com/sircylee/Queen_Kylie-V1`;
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});
