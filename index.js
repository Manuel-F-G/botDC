process.env.FFMPEG_PATH = require('ffmpeg-static');

const {
  Client,
  GatewayIntentBits,
  Partials
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
const { FFmpeg } = require('prism-media');
const ffmpegPath = require('ffmpeg-static');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

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

let followedUserId = null;
let connection = null;
let player = null;
let isPaused = false;
const AUDIO_FILE = './sonido.mp3';

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  console.log('🎵 sonido.mp3 existe:', fs.existsSync(AUDIO_FILE));
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Timeout global para !play o !p
  if (message.content.startsWith('!play') || message.content.startsWith('!p')) {
    try {
      const member = message.member;
      if (!member.moderatable) {
        return message.reply('❌ No puedo dar timeout a este usuario.');
      }

      await member.timeout(10_000, 'Usó !play o !p');
      await message.reply(`⏳ ${member.user.tag} recibió timeout por usar !play o !p.`);
    } catch (err) {
      console.error('Error al aplicar timeout:', err);
      message.reply('❌ Hubo un error al aplicar el timeout.');
    }
  }

  // Interrumpir a un usuario
  if (message.content.startsWith('!interrumpir')) {
    const mentioned = message.mentions.users.first();
    if (!mentioned) return message.reply('❌ Debes mencionar a alguien.');
    followedUserId = mentioned.id;
    isPaused = false;
    message.reply(`👂 Siguiendo a ${mentioned.username}`);
  }

  // Pausar
  if (message.content === '!pausar') {
    followedUserId = null;
    isPaused = true;
    if (connection) {
      connection.destroy();
      connection = null;
    }
    message.reply('⏸️ Interrupciones pausadas.');
  }
});

// Reacciona al usuario hablando
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot || user.id !== followedUserId) return;

  const channel = newState.channel;
  if (!channel || isPaused) return;

  if (!connection || connection.joinConfig.channelId !== channel.id) {
    try {
      if (connection) connection.destroy();

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a ${channel.name}`);

      player = createAudioPlayer();
      connection.subscribe(player);
    } catch (err) {
      console.error('❌ Error al conectar a voz:', err);
      return;
    }
  }

  // Si el usuario se desmutea o habla
  if (!oldState.selfMute && newState.speaking) {
    playSound();
  }
});

function playSound() {
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error('❌ Archivo sonido.mp3 no encontrado');
    return;
  }

  const ffmpeg = new FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', AUDIO_FILE,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ],
    executablePath: ffmpegPath
  });

  const resource = createAudioResource(ffmpeg);
  player.play(resource);

  player.on(AudioPlayerStatus.Playing, () => {
    console.log('▶️ Reproduciendo sonido');
  });

  player.on('error', err => {
    console.error('❌ Error en el reproductor:', err);
  });
}

client.login(process.env.DISCORD_TOKEN);
