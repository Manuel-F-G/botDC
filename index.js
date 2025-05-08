const { Client, GatewayIntentBits, Partials } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const { FFmpeg } = require('prism-media');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const express = require('express');

process.env.FFMPEG_PATH = ffmpegInstaller.path;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const AUDIO_FILE = './sonido.mp3'; // Cambia esto con la ruta de tu archivo de sonido
let targetUser = null; // Usuario al que se sigue
let player = null;
let connection = null;
let isPaused = false;

// Comandos y configuración
const ALLOWED_CHANNELS = [
  '1369775267639201792', // ID de los canales donde el bot escucha comandos
  '1369547402465509376',
  '1369767579752730745'
];

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// Función para unirse al canal de voz
async function joinToVoiceChannel(channel) {
  if (connection) {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  console.log(`🔊 Conectado a canal de voz: ${channel.name}`);
}

// Comando !interrumpir
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  if (args[0] === '!interrumpir' && args[1]) {
    const userId = args[1].replace(/[<@!>]/g, ''); // Extrae el ID del usuario
    targetUser = await message.guild.members.fetch(userId);

    const channel = targetUser.voice.channel;

    if (!channel) {
      return message.reply('❌ El usuario no está en un canal de voz.');
    }

    await joinToVoiceChannel(channel);
    message.reply(`🔊 Ahora sigo a ${targetUser.user.tag} y reproduzco sonido cuando hable.`);
  }

  // Comando para pausar la reproducción
  if (args[0] === '!pausar') {
    if (isPaused) {
      return message.reply('❌ La reproducción ya está pausada.');
    }
    isPaused = true;
    player.pause();
    message.reply('⏸️ Reproducción pausada.');
  }
});

// Seguimiento del usuario y reproducción cuando hable
client.on('voiceStateUpdate', (oldState, newState) => {
  if (!targetUser || !targetUser.voice || newState.member.user.bot) return;

  if (newState.member.id === targetUser.id && newState.channelId !== oldState.channelId) {
    // Si el usuario objetivo se mueve de canal
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
    joinToVoiceChannel(newState.channel);
  }

  if (newState.channelId === oldState.channelId && newState.member.id === targetUser.id) {
    // Reproducir cuando el usuario hable en el canal
    if (newState.channelId && connection && !isPaused) {
      const player = createAudioPlayer();
      const resource = createAudioResource(new FFmpeg({
        args: [
          '-analyzeduration', '0',
          '-loglevel', '0',
          '-i', AUDIO_FILE,
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2'
        ],
        executablePath: ffmpegInstaller.path
      }));

      player.play(resource);
      connection.subscribe(player);
      player.once(AudioPlayerStatus.Idle, () => {
        console.log('Audio terminado');
      });
    }
  }
});

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
