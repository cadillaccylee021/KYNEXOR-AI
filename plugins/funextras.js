// plugins/funextras.js — Extra fun commands ported to Queen Kylie V1 format
'use strict';

const { cmd } = require('../command');
const axios = require('axios');
const fetch = require('node-fetch');

// ─── Shared fetch helpers ────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── rizz ────────────────────────────────────────────────────────────────

cmd({
  pattern: 'rizz',
  desc: 'Get a random pickup line.',
  category: 'fun',
  react: '😏',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const data = await fetchJson('https://api.popcat.xyz/pickuplines');
    await reply(`😏 ${data.pickupline}`);
  } catch (e) {
    console.error('rizz error:', e);
    await reply('❌ Could not fetch a pickup line right now. Try again!');
  }
});

// ─── question ────────────────────────────────────────────────────────────

cmd({
  pattern: 'question',
  desc: 'Get a random fun question.',
  category: 'fun',
  react: '❓',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    // Uses a public trivia/question API
    const data = await fetchJson('https://opentdb.com/api.php?amount=1&type=multiple');
    const q = data.results[0];
    await reply(`❓ *Question:*\n${q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&')}\n\n📂 _Category: ${q.category} | Difficulty: ${q.difficulty}_`);
  } catch (e) {
    console.error('question error:', e);
    await reply('❌ Could not fetch a question right now.');
  }
});

// ─── truth ───────────────────────────────────────────────────────────────

cmd({
  pattern: 'truth',
  desc: 'Get a truth dare — truth.',
  category: 'fun',
  react: '🫣',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const data = await fetchJson('https://api.truthordarebot.xyz/v1/truth');
    await reply(`🫣 *Truth:*\n${data.question}`);
  } catch (e) {
    console.error('truth error:', e);
    await reply('❌ Could not fetch a truth question right now.');
  }
});

// ─── dare ────────────────────────────────────────────────────────────────

cmd({
  pattern: 'dare',
  desc: 'Get a truth dare — dare.',
  category: 'fun',
  react: '😈',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const data = await fetchJson('https://api.truthordarebot.xyz/v1/dare');
    await reply(`😈 *Dare:*\n${data.question}`);
  } catch (e) {
    console.error('dare error:', e);
    await reply('❌ Could not fetch a dare right now.');
  }
});

// ─── joke ────────────────────────────────────────────────────────────────

cmd({
  pattern: 'joke',
  desc: 'Get a random joke.',
  category: 'fun',
  react: '😂',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const data = await fetchJson('https://official-joke-api.appspot.com/random_joke');
    await reply(`😂 *${data.setup}*\n\n🥁 ${data.punchline}`);
  } catch (e) {
    console.error('joke error:', e);
    await reply('❌ Could not fetch a joke right now.');
  }
});

// ─── joke2 ───────────────────────────────────────────────────────────────

cmd({
  pattern: 'joke2',
  alias: ['darkjoke'],
  desc: 'Get a single-line joke.',
  category: 'fun',
  react: '😂',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const data = await fetchJson('https://v2.jokeapi.dev/joke/Any?type=single');
    await reply(`😂 ${data.joke}`);
  } catch (e) {
    console.error('joke2 error:', e);
    await reply('❌ Could not fetch a joke right now.');
  }
});

// ─── fact ────────────────────────────────────────────────────────────────

cmd({
  pattern: 'fact',
  desc: 'Get a random fun fact.',
  category: 'fun',
  react: '🧠',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const { data } = await axios.get('https://nekos.life/api/v2/fact');
    await reply(`🧠 *Fact:*\n${data.fact}`);
  } catch (e) {
    console.error('fact error:', e);
    await reply('❌ Could not fetch a fact right now.');
  }
});

// ─── quotes ──────────────────────────────────────────────────────────────

cmd({
  pattern: 'quotes',
  alias: ['qotd'],
  desc: 'Get the quote of the day.',
  category: 'fun',
  react: '🎗️',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const { data } = await axios.get('https://favqs.com/api/qotd');
    const q = data.quote;
    await reply(
      `╔════◇\n` +
      `║ 🎗️ *${q.body}*\n` +
      `║\n` +
      `║ 👤 _— ${q.author}_\n` +
      `╚════════════╝`
    );
  } catch (e) {
    console.error('quotes error:', e);
    await reply('❌ Could not fetch a quote right now.');
  }
});

// ─── define (Urban Dictionary) ────────────────────────────────────────────

cmd({
  pattern: 'define',
  desc: 'Look up a word on Urban Dictionary.',
  category: 'fun',
  react: '📖',
  filename: __filename
}, async (conn, mek, m, { q, reply, pushname }) => {
  try {
    const word = q || (m.quoted && m.quoted.text);
    if (!word) return reply(`📖 Please tell me what word to define.\nExample: *define slay*`);

    const { data } = await axios.get(`http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);

    if (!data || !data.list || !data.list.length) {
      return reply(`❌ No Urban Dictionary results found for *${word}*.`);
    }

    const entry = data.list[0];
    const definition = entry.definition.replace(/\[/g, '').replace(/\]/g, '');
    const example = entry.example.replace(/\[/g, '').replace(/\]/g, '');

    await reply(
      `📖 *${word}*\n\n` +
      `*Definition:*\n${definition}\n\n` +
      `*Example:*\n_${example || 'N/A'}_\n\n` +
      `👍 ${entry.thumbs_up}  👎 ${entry.thumbs_down}`
    );
  } catch (e) {
    console.error('define error:', e);
    await reply('❌ Could not look up that word right now.');
  }
});

// ─── fakeinfo ─────────────────────────────────────────────────────────────

cmd({
  pattern: 'fakeinfo',
  alias: ['fakeid'],
  desc: 'Generate a fake identity.',
  category: 'fun',
  react: '🪪',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    // randomuser.me is the reliable public API for fake identities
    const { data } = await axios.get('https://randomuser.me/api/');
    const p = data.results[0];
    const name = `${p.name.title} ${p.name.first} ${p.name.last}`;
    const dob = new Date(p.dob.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    await reply(
      `🪪 *Fake Identity*\n\n` +
      `👤 *Name:* ${name}\n` +
      `📅 *DOB:* ${dob} (Age ${p.dob.age})\n` +
      `🚻 *Gender:* ${p.gender}\n` +
      `📞 *Phone:* ${p.phone}\n` +
      `📧 *Email:* ${p.email}\n` +
      `🌍 *Location:* ${p.location.city}, ${p.location.state}, ${p.location.country}\n` +
      `🔑 *Username:* ${p.login.username}\n` +
      `🔒 *Password:* ${p.login.password}`
    );
  } catch (e) {
    console.error('fakeinfo error:', e);
    await reply('❌ Could not generate fake info right now.');
  }
});

// ─── insult ───────────────────────────────────────────────────────────────

cmd({
  pattern: 'insult',
  desc: 'Get a random (harmless) insult.',
  category: 'fun',
  react: '😤',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    // evilinsult.com is a reliable public API
    const { data } = await axios.get('https://evilinsult.com/generate_insult.php?lang=en&type=json');
    await reply(`😤 ${data.insult}`);
  } catch (e) {
    console.error('insult error:', e);
    await reply('❌ Could not fetch an insult right now.');
  }
});

// ─── lines ────────────────────────────────────────────────────────────────

cmd({
  pattern: 'lines',
  alias: ['nicemsg', 'positivity'],
  desc: 'Get a nice positive message.',
  category: 'fun',
  react: '🌸',
  filename: __filename
}, async (conn, mek, m, { reply }) => {
  try {
    const { data } = await axios.get('https://zenquotes.io/api/random');
    const q = data[0];
    await reply(`🌸 *${q.q}*\n\n_— ${q.a}_`);
  } catch (e) {
    console.error('lines error:', e);
    await reply('❌ Could not fetch a message right now.');
  }
});
