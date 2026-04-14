'use strict';
const { cmd } = require('../command');
const config = require('../config');

async function textpro(url, texts) {
  try {
    const { textpro: tp } = require('mumaker');
    return await tp(url, texts);
  } catch { return null; }
}

const tpCmd = (pattern, desc, urlPath, dual = false) => {
  cmd({ pattern, desc, category: 'textfx', filename: __filename },
  async (conn, mek, m, { from, q, reply }) => {
    try {
      const prefix = config.PREFIX || '/';
      let text1, text2;
      if (dual) {
        [text1, text2] = (q || '').split(';').map(s => s.trim());
        if (!text1 || !text2) return reply(`*Example:* ${prefix}${pattern} Text1;Text2`);
      } else {
        text1 = q;
        if (!text1) return reply(`*Example:* ${prefix}${pattern} YourName`);
      }
      const url = urlPath.startsWith('http') ? urlPath : `https://textpro.me/${urlPath}.html`;
      await conn.sendMessage(from, { text: '⏳ *Generating...*' }, { quoted: mek });
      const r = await textpro(url, dual ? [text1, text2] : [text1]);
      if (r?.image) {
        await conn.sendMessage(from, { image: { url: r.image }, caption: `_${config.BOT_NAME || 'QUEEN_KYLIE'}_` }, { quoted: mek });
      } else {
        reply('*_Failed to generate. Try again!_*');
      }
    } catch (e) { reply(`❌ Error: ${e.message}`); }
  });
};

tpCmd('glow',       'Glowing text effect',          'https://ephoto360.com/hieu-ung-chu/tao-hieu-ung-chu-mam-anh-sang-74.html');
tpCmd('glitch',     'Digital glitch text',           'https://ephoto360.com/tao-hieu-ung-chu-digital-glitch-truc-tuyen-941.html');
tpCmd('pixel',      'Pixel glitch text',             'https://ephoto360.com/tao-hieu-ung-chu-pixel-glitch-truc-tuyen-940.html');
tpCmd('grafiti',    'Graffiti text style',           'https://ephoto360.com/tao-hieu-ung-chu-graffiti-duong-pho-an-tuong-online-795.html');
tpCmd('grafiti2',   'Graffiti text style 2',         'https://ephoto360.com/hieu-ung-chu/chu-graffiti-online-mau-8-182.html');
tpCmd('grafiti3',   'Graffiti text (dual)',          'tao-hieu-ung-chu-graffiti-sieu-ngau-online-794', true);
tpCmd('grafiti4',   'Cover graffiti (dual)',         'https://ephoto360.com/hieu-ung-chu/tao-cover-graffiti-online-181.html', true);
tpCmd('gradient',   'Gradient 3D text (dual)',       'https://ephoto360.com/tao-logo-gradient-3d-truc-tuyen-501.html', true);
tpCmd('wtone',      'Watercolor tone (dual)',        'https://ephoto360.com/tao-logo-chu-truc-tuyen-499.html', true);
tpCmd('phub',       'PornHub style logo (dual)',     'https://ephoto360.com/tao-logo-phong-cach-pornhub-612.html', true);
tpCmd('avenger',    'Avengers logo (dual)',          'https://ephoto360.com/tao-logo-3d-phong-cach-avengers-445.html', true);
tpCmd('marvel',     'Marvel logo (dual)',            'https://ephoto360.com/tao-logo-phong-cach-marvel-419.html', true);
tpCmd('sea',        'Deep sea metal text',           'create-3d-deep-sea-metal-text-effect-online-1053');
tpCmd('horror',     'Horror blood text',             'horror-blood-text-effect-online-883');
tpCmd('joker',      'Joker logo text',               'create-logo-joker-online-934');
tpCmd('metallic',   'Metallic text',                 'create-a-metallic-text-effect-free-online-1041');
tpCmd('luxury',     '3D luxury gold text',           '3d-luxury-gold-text-effect-online-1003');
tpCmd('glue',       '3D glue text',                  'create-3d-glue-text-effect-with-realistic-style-986');
tpCmd('fabric',     'Fabric text',                   'fabric-text-effect-online-964');
tpCmd('toxic',      'Toxic text',                    'toxic-text-effect-online-901');
tpCmd('ancient',    '3D golden ancient text',        '3d-golden-ancient-text-effect-online-free-1060');
tpCmd('cloud',      'Cloud sky text',                'create-a-cloud-text-effect-on-the-sky-online-1004');
tpCmd('transformer','Transformer text',              'create-a-transformer-text-effect-online-1035');
tpCmd('thunder',    'Thunder text',                  'online-thunder-text-effect-generator-1031');
tpCmd('scifi',      'Sci-fi 3D text',                'create-3d-sci-fi-text-effect-online-1050');
tpCmd('sand',       'Sand beach text',               'write-in-sand-summer-beach-free-online-991');
tpCmd('rainbow',    '3D rainbow text',               '3d-rainbow-color-calligraphy-text-effect-1049');
tpCmd('pencil',     'Sketch/pencil text',            'create-a-sketch-text-effect-online-1044');
tpCmd('neon',       '3D neon text',                  'create-3d-neon-light-text-effect-online-1028');
tpCmd('magma',      'Magma hot text',                'create-a-magma-hot-text-effect-online-1030');
tpCmd('leaves',     'Natural leaves text',           'natural-leaves-text-effect-931');
tpCmd('discovery',  'Space discovery text',          'create-space-text-effects-online-free-1042');
tpCmd('christmas',  'Christmas tree text',           'christmas-tree-text-effect-online-free-1057');
tpCmd('candy',      'Christmas candy cane text',     'create-christmas-candy-cane-text-effect-1056');
tpCmd('hp',         'Harry Potter text',             'create-harry-potter-text-effect-online-1025');
tpCmd('underwater', 'Underwater 3D text',            '3d-underwater-text-effect-generator-online-1013');
