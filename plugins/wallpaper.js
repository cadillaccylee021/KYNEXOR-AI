'use strict';
const { cmd } = require('../command');
const config = require('../config');
const fetch = require('node-fetch');

const caption = `_Powered by ${config.BOT_NAME || 'QUEEN_KYLIE'}_`;

const wallpaperCmd = (pattern, desc, endpoint) => {
  cmd({ pattern, desc, category: 'wallpaper', filename: __filename },
  async (conn, mek, m, { from, reply }) => {
    try {
      const res = await fetch(`https://api.maher-zubair.tech/wallpaper/${endpoint}`);
      const data = await res.json();
      if (data.status === 200 && data.url) {
        await conn.sendMessage(from, { image: { url: data.url }, caption }, { quoted: mek });
      } else {
        reply('*_Could not fetch wallpaper, try again!_*');
      }
    } catch (e) {
      reply(`❌ Error: ${e.message}`);
    }
  });
};

wallpaperCmd('aesthetic', 'Aesthetic wallpaper', 'asthetic');
wallpaperCmd('bike', 'Bike wallpaper', 'bike');
wallpaperCmd('cr7', 'Cristiano Ronaldo wallpaper', 'cr7');
wallpaperCmd('messi', 'Lionel Messi wallpaper', 'messi');
wallpaperCmd('mlegend', 'Mobile Legends wallpaper', 'mlegend');
wallpaperCmd('pubgwallpaper', 'PUBG wallpaper', 'pubg');
wallpaperCmd('wallpapercar', 'Car wallpaper', 'car');
wallpaperCmd('bpwallpaper', 'Blackpink wallpaper', 'blackpink');
wallpaperCmd('wallpaperrandom', 'Random wallpaper', 'random');
