const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require('@discordjs/voice');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const prism = require('prism-media');
const express = require('express');
const fs = require('fs');

process.env.FFMPEG_PATH = ffmpegInstaller.path; // 👈 Necesario para que funcione en Railway

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// === CONFIGURACIÓN ===
const TARGET_USER_IDS = [
  '1368112694468808807',
  '1298518404033941565',
  '1055009202168406118', 
  '752987605808840807',
  '1344499474994823230'
];
const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];
const TIMEOUT_MS = 10 * 1000;
const AUDIO_FILE = './sonido.mp3';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

let connection = null;
let currentChannelId = null;
let player = null;

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Timeout con !play o !p
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!play') || message.content.startsWith('!p')) {
    if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;

    try {
      const member = message.member;
      if (!member.moderatable) {
        return message.reply('❌ No puedo dar timeout a este usuario.');
      }

      await member.timeout(TIMEOUT_MS, 'Usó !play o !p en canal permitido');
      await message.reply(
        `⏳ ${member.user.tag} recibió timeout por usar !play o !p.`
      );
    } catch (err) {
      console.error('Error al aplicar timeout:', err);
      message.reply('❌ Hubo un error al aplicar el timeout.');
    }
  }
});

// Seguimiento de usuarios en canales de voz
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  const joinedTarget = TARGET_USER_IDS.includes(user.id) && newState.channelId !== null;
  const leftChannel = TARGET_USER_IDS.includes(user.id) && newState.channelId === null;

  if (joinedTarget) {
    const channel = newState.channel;
    if (!channel) return;

    // Si ya está en un canal, cámbialo
    if (connection) connection.destroy();

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a canal de voz: ${channel.name}`);

      // Crear reproductor y reproducir en bucle
      player = createAudioPlayer();
      playLoop();
      connection.subscribe(player);

    } catch (error) {
      console.error('❌ Error al conectar a voz:', error);
    }
  }

  // Si el último usuario objetivo se va del canal, detener audio y salir
  if (leftChannel && newState.channelId === null && connection) {
    const stillSomeone = newState.guild.members.cache.some(m =>
      TARGET_USER_IDS.includes(m.id) && m.voice.channelId
    );

    if (!stillSomeone) {
      player?.stop();
      connection.destroy();
      connection = null;
      console.log('👋 Salí del canal de voz');
    }
  }
});

// Función para reproducir el sonido en bucle
function playLoop() {
  const resource = createAudioResource(new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', AUDIO_FILE,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ]
  }));

  player.play(resource);

  player.once(AudioPlayerStatus.Idle, () => {
    playLoop(); // repetir
  });
}

client.login(process.env.DISCORD_TOKEN);
