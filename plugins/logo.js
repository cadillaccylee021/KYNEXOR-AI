'use strict';
const { cmd } = require('../command');
const config = require('../config');
const fetch = require('node-fetch');

async function textpro(url, texts) {
  try {
    const { textpro: tp } = require('mumaker');
    return await tp(url, texts);
  } catch { return null; }
}

const logoCmd = (pattern, type, desc, urlPath, dual = false) => {
  cmd({ pattern, desc, category: 'logo', filename: __filename },
  async (conn, mek, m, { from, q, reply }) => {
    try {
      const caption = `_${config.BOT_NAME || 'QUEEN_KYLIE'}_`;
      const prefix = config.PREFIX || '/';
      let text1, text2;
      if (dual) {
        [text1, text2] = (q || '').split(';').map(s => s.trim());
        if (!text1 || !text2) return reply(`*Example:* ${prefix}${pattern} YourText;SubText`);
      } else {
        text1 = q;
        if (!text1) return reply(`*Example:* ${prefix}${pattern} YourName`);
      }
      const baseUrl = type === '1' ? `https://ephoto360.com/${urlPath}.html` :
                      type === '2' ? `https://photooxy.com/${urlPath}.html` :
                      `https://textpro.me/${urlPath}.html`;
      await conn.sendMessage(from, { text: '⏳ *Generating logo...*' }, { quoted: mek });
      const result = await textpro(baseUrl, dual ? [text1, text2] : [text1]);
      if (result?.image) {
        await conn.sendMessage(from, { image: { url: result.image }, caption }, { quoted: mek });
      } else {
        reply('*_Failed to generate logo. Please try again!_*');
      }
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });
};

logoCmd('logo1', '1', 'Logo: Light glow style', 'hieu-ung-chu/tao-hieu-ung-chu-mam-anh-sang-74');
logoCmd('logo2', '1', 'Logo: Digital glitch style', 'tao-hieu-ung-chu-digital-glitch-truc-tuyen-941');
logoCmd('logo3', '1', 'Logo: Pixel glitch style', 'tao-hieu-ung-chu-pixel-glitch-truc-tuyen-940');
logoCmd('logo4', '1', 'Logo: Street graffiti style', 'tao-hieu-ung-chu-graffiti-duong-pho-an-tuong-online-795');
logoCmd('logo5', '1', 'Logo: Graffiti style 2', 'hieu-ung-chu/chu-graffiti-online-mau-8-182');
logoCmd('logo6', '',  'Logo: Super graffiti (dual text)', 'tao-hieu-ung-chu-graffiti-sieu-ngau-online-794', true);
logoCmd('logo7', '1', 'Logo: Cover graffiti (dual text)', 'hieu-ung-chu/tao-cover-graffiti-online-181', true);
logoCmd('logo8', '1', 'Logo: 3D Gradient (dual text)', 'tao-logo-gradient-3d-truc-tuyen-501', true);
logoCmd('logo9', '1', 'Logo: 3D Text (dual text)', 'tao-logo-chu-truc-tuyen-499', true);
logoCmd('logo10','1', 'Logo: Phub style (dual text)', 'tao-logo-phong-cach-pornhub-612', true);
logoCmd('logo11','1', 'Logo: Avengers style (dual text)', 'tao-logo-3d-phong-cach-avengers-445', true);
logoCmd('logo12','1', 'Logo: Marvel style (dual text)', 'tao-logo-phong-cach-marvel-419', true);

// PUBG logos
logoCmd('pubg1', '1', 'PUBG Logo 1', 'tao-cover-game-pubg-anh-bia-game-playerunknown-s-battlegrounds-401');
logoCmd('pubg2', '1', 'PUBG Logo 2', 'tao-anh-bia-cover-facebook-game-pubg-407');
logoCmd('pubg3', '1', 'PUBG Logo 3', 'tao-logo-pubg-truc-tuyen-mien-phi-714');
logoCmd('pubg4', '1', 'PUBG Logo 4', 'tao-logo-mascot-pubg-online-sieu-ngau-716');
logoCmd('pubg5', '1', 'PUBG Logo 5', 'tao-logo-pubg-truc-tuyen-nhieu-mau-sac-717');
logoCmd('pubg6', '1', 'PUBG Logo 6', 'tao-logo-pubg-phong-cach-chibi-online-721');
logoCmd('pubg7', '1', 'PUBG Logo 7 (dual text)', 'tao-logo-pubg-truc-tuyen-phong-cach-den-trang-715', true);
