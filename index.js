process.env.FFMPEG_PATH = require('ffmpeg-static');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { FFmpeg } = require('prism-media');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// === CONFIGURACIÓN ===
const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];
const TARGET_USER_IDS = [
  '1298518404033941565', 
  '1357943865931468911']; // Este es solo un ejemplo. Cambia con tus usuarios.

const AUDIO_FILE = './sonido.mp3'; // Asegúrate de que el archivo de sonido esté en la ruta correcta

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

let connection = null;
let player = null;

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Función para reproducir el audio en bucle
function playSound() {
  const ffmpeg = new FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', AUDIO_FILE,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ],
    executablePath: ffmpegInstaller.path // Asegúrate de que esta ruta esté bien
  });

  const resource = createAudioResource(ffmpeg);
  player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);

  player.once('idle', () => {
    console.log('Audio terminado, reiniciando...');
    playSound(); // Volver a reproducir el sonido cuando termine
  });
}

// Seguimiento de usuarios en canales de voz
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  const joinedTarget = TARGET_USER_IDS.includes(user.id) && newState.channelId !== null;
  const leftChannel = TARGET_USER_IDS.includes(user.id) && newState.channelId === null;

  // Si el usuario objetivo se une a un canal de voz
  if (joinedTarget) {
    const channel = newState.channel;
    if (!channel) return;

    if (connection) connection.destroy(); // Desconectar del canal anterior si ya está conectado

    // Unirse al canal de voz
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    try {
      await connection.once(VoiceConnectionStatus.Ready, () => {
        console.log(`🔊 Conectado al canal de voz: ${channel.name}`);
        playSound(); // Reproducir el sonido al conectarse al canal
      });
    } catch (error) {
      console.error('❌ Error al conectar a voz:', error);
    }
  }

  // Si el usuario objetivo se desconecta del canal de voz
  if (leftChannel && connection) {
    const guild = newState.guild;
    const stillSomeone = guild.members.cache.some(m =>
      TARGET_USER_IDS.includes(m.id) && m.voice.channelId
    );

    // Si no hay más usuarios objetivos en el canal, desconectarse
    if (!stillSomeone) {
      connection.destroy();
      connection = null;
      console.log('👋 Salí del canal de voz porque ya no hay más usuarios objetivo');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
